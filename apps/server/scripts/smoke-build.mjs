import { spawn } from "node:child_process";
import { once } from "node:events";
import { rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const START_TIMEOUT_MS = 10_000;
const STOP_TIMEOUT_MS = 5000;
const RETRY_INTERVAL_MS = 50;

const serverDirectory = fileURLToPath(new URL("..", import.meta.url));
const entryPath = path.join(serverDirectory, "dist/index.js");
const databasePath = path.join(
  tmpdir(),
  `ts-fullstack-server-smoke-${process.pid}.db`
);

const findAvailablePort = async () =>
  new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("Could not allocate a smoke-test port"));
        return;
      }

      probe.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });

const waitForHealth = async (
  runningProcess,
  healthPort,
  readOutput,
  deadline = Date.now() + START_TIMEOUT_MS
) => {
  if (runningProcess.exitCode !== null) {
    throw new Error(`Built Server exited before startup.\n${readOutput()}`);
  }

  try {
    const response = await fetch(`http://127.0.0.1:${healthPort}/healthz`);
    if (response.ok) {
      return;
    }
  } catch {
    // The process may still be binding the port.
  }

  if (Date.now() >= deadline) {
    throw new Error(`Built Server did not become healthy.\n${readOutput()}`);
  }

  await delay(RETRY_INTERVAL_MS);
  return waitForHealth(runningProcess, healthPort, readOutput, deadline);
};

const stopProcess = async (runningProcess, exitPromise) => {
  if (runningProcess.exitCode !== null) {
    return;
  }

  runningProcess.kill("SIGTERM");
  const stopped = await Promise.race([
    exitPromise.then(() => true),
    delay(STOP_TIMEOUT_MS).then(() => false),
  ]);

  if (!stopped && runningProcess.exitCode === null) {
    runningProcess.kill("SIGKILL");
    await exitPromise;
  }
};

const removeDatabaseFiles = () =>
  Promise.all(
    ["", "-shm", "-wal"].map((suffix) =>
      rm(`${databasePath}${suffix}`, { force: true })
    )
  );

const serverPort = await findAvailablePort();
const serverProcess = spawn(
  process.execPath,
  ["--no-experimental-strip-types", entryPath],
  {
    env: {
      ...process.env,
      DATABASE_URL: pathToFileURL(databasePath).href,
      LOG_LEVEL: "error",
      NODE_ENV: "production",
      PORT: String(serverPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
const serverExited = once(serverProcess, "exit");
let output = "";

for (const stream of [serverProcess.stdout, serverProcess.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    output += chunk;
  });
}

try {
  await waitForHealth(serverProcess, serverPort, () => output);
  process.stdout.write("Built Server smoke check passed: GET /healthz\n");
} finally {
  await stopProcess(serverProcess, serverExited);
  await removeDatabaseFiles();
}
