export interface ShutdownLogger {
  error: (data: object, message: string) => void;
  info: (data: object, message: string) => void;
}

export interface ShutdownServer {
  close: (callback: (error?: Error) => void) => void;
  closeAllConnections?: () => void;
}

export interface ShutdownRequest {
  exitCode?: number;
  reason: string;
}

interface ShutdownTimer {
  unref?: () => void;
}

export interface CreateShutdownOptions {
  clearTimeout?: (timer: ShutdownTimer) => void;
  closeDatabase: () => void;
  /** Flush and stop the tracer provider; runs after the database closes. */
  closeTracing?: () => Promise<void>;
  /**
   * Time between reporting not-ready and closing HTTP, so a load balancer
   * stops routing here first. Must be below `timeoutMs`.
   */
  drainMs: number;
  exit: (code: number) => void;
  log: ShutdownLogger;
  /** Flip readiness to not-ready; called once, before draining. */
  onDrainStart: () => void;
  server: ShutdownServer;
  setTimeout?: (callback: () => void, milliseconds: number) => ShutdownTimer;
  timeoutMs: number;
}

const scheduleTimeout = (
  callback: () => void,
  milliseconds: number
): ShutdownTimer => setTimeout(callback, milliseconds);

const cancelTimeout = (timer: ShutdownTimer): void => {
  clearTimeout(timer as ReturnType<typeof setTimeout>);
};

export function createShutdown(options: CreateShutdownOptions) {
  const {
    clearTimeout: clearShutdownTimeout = cancelTimeout,
    closeDatabase,
    closeTracing,
    drainMs,
    exit,
    log,
    onDrainStart,
    server,
    setTimeout: setShutdownTimeout = scheduleTimeout,
    timeoutMs,
  } = options;
  let completion: Promise<void> | undefined;
  let requestedExitCode = 0;
  let shutdownReason = "unknown";

  return (request: ShutdownRequest): Promise<void> => {
    requestedExitCode = Math.max(requestedExitCode, request.exitCode ?? 0);
    shutdownReason = request.reason;

    if (completion) {
      return completion;
    }

    log.info({ drainMs, reason: shutdownReason }, "shutting down");
    onDrainStart();

    completion = new Promise<void>((resolve) => {
      let closing = false;
      let finished = false;
      let timer: ShutdownTimer | undefined;
      let drainTimer: ShutdownTimer | undefined;

      const clearTimers = (): void => {
        for (const pending of [timer, drainTimer]) {
          if (pending) {
            clearShutdownTimeout(pending);
          }
        }
      };

      // Called by the timeout too: a stuck `closeTracing` must not keep the
      // process alive past `timeoutMs`.
      const complete = (exitCode: number): void => {
        if (finished) {
          return;
        }
        finished = true;
        clearTimers();

        const finalExitCode = Math.max(exitCode, requestedExitCode);
        const logData = { exitCode: finalExitCode, reason: shutdownReason };
        if (finalExitCode === 0) {
          log.info(logData, "shutdown complete");
        } else {
          log.error(logData, "shutdown complete with errors");
        }

        exit(finalExitCode);
        resolve();
      };

      const finish = (exitCode: number): void => {
        if (closing || finished) {
          return;
        }
        closing = true;

        let finalExitCode = exitCode;
        try {
          closeDatabase();
        } catch (error) {
          finalExitCode = 1;
          log.error({ err: error }, "database close failed");
        }

        if (!closeTracing) {
          complete(finalExitCode);
          return;
        }

        closeTracing().then(
          () => complete(finalExitCode),
          (error: unknown) => {
            log.error({ err: error }, "tracing close failed");
            complete(1);
          }
        );
      };

      timer = setShutdownTimeout(() => {
        log.error({ timeoutMs }, "forced exit after shutdown timeout");
        try {
          server.closeAllConnections?.();
        } catch (error) {
          log.error({ err: error }, "failed to force-close HTTP connections");
        }
        if (!closing) {
          closing = true;
          try {
            closeDatabase();
          } catch (error) {
            log.error({ err: error }, "database close failed");
          }
        }
        complete(1);
      }, timeoutMs);
      timer.unref?.();

      const closeServer = (): void => {
        try {
          server.close((error) => {
            if (error) {
              log.error({ err: error }, "HTTP server close failed");
            }
            finish(error ? 1 : 0);
          });
        } catch (error) {
          log.error({ err: error }, "HTTP server close failed");
          finish(1);
        }
      };

      if (drainMs > 0) {
        drainTimer = setShutdownTimeout(closeServer, drainMs);
      } else {
        closeServer();
      }
    });

    return completion;
  };
}
