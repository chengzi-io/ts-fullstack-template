import { config } from "dotenv";

/** Field parser — like envalid validators. */
export interface EnvSpec<T> {
  parse: (key: string, raw: string | undefined) => T;
}

function blankToUndefined(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function missing(key: string): never {
  throw new Error(`${key}: is required`);
}

/** Non-empty string. `""` counts as unset. */
export function str(options?: { default: string }): EnvSpec<string>;
export function str(options: { optional: true }): EnvSpec<string | undefined>;
export function str(
  options: { default?: string; optional?: boolean } = {}
): EnvSpec<string | undefined> {
  return {
    parse(key, raw) {
      const value = blankToUndefined(raw);
      if (value !== undefined) {
        return value;
      }
      if (options.default !== undefined) {
        return options.default;
      }
      if (options.optional) {
        return;
      }
      return missing(key);
    },
  };
}

/** Finite number from env string. */
export function num(options?: { default: number }): EnvSpec<number>;
export function num(options: { optional: true }): EnvSpec<number | undefined>;
export function num(
  options: { default?: number; optional?: boolean } = {}
): EnvSpec<number | undefined> {
  return {
    parse(key, raw) {
      const value = blankToUndefined(raw);
      if (value === undefined) {
        if (options.default !== undefined) {
          return options.default;
        }
        if (options.optional) {
          return;
        }
        return missing(key);
      }
      const n = Number(value);
      if (!Number.isFinite(n)) {
        throw new Error(
          `${key}: must be a number (got ${JSON.stringify(raw)})`
        );
      }
      return n;
    },
  };
}

/** TCP port 1–65535. */
export function port(options: { default?: number } = {}): EnvSpec<number> {
  const base =
    options.default === undefined ? num() : num({ default: options.default });

  return {
    parse(key, raw) {
      const n = base.parse(key, raw);
      if (!Number.isInteger(n) || n < 1 || n > 65_535) {
        throw new Error(`${key}: must be an integer port 1–65535 (got ${n})`);
      }
      return n;
    },
  };
}

const TRUTHY = new Set(["1", "true", "yes", "on"]);
const FALSY = new Set(["0", "false", "no", "off"]);

/** Boolean from common env spellings (`true`/`1`/`yes`/`on`, …). */
export function bool(options?: { default: boolean }): EnvSpec<boolean>;
export function bool(options: { optional: true }): EnvSpec<boolean | undefined>;
export function bool(
  options: { default?: boolean; optional?: boolean } = {}
): EnvSpec<boolean | undefined> {
  return {
    parse(key, raw) {
      const value = blankToUndefined(raw)?.toLowerCase();
      if (value === undefined) {
        if (options.default !== undefined) {
          return options.default;
        }
        if (options.optional) {
          return;
        }
        return missing(key);
      }
      if (TRUTHY.has(value)) {
        return true;
      }
      if (FALSY.has(value)) {
        return false;
      }
      throw new Error(
        `${key}: must be a boolean (true/false/1/0/yes/no/on/off), got ${JSON.stringify(raw)}`
      );
    },
  };
}

type Specs = Record<string, EnvSpec<unknown>>;

export type InferEnv<S extends Specs> = {
  [K in keyof S]: S[K] extends EnvSpec<infer T> ? T : never;
};

export interface LoadEnvOptions {
  /** Shown when validation fails. */
  hint?: string;
  /** dotenv path relative to cwd. Default `.env`. */
  path?: string;
}

/**
 * Load dotenv (if present) and validate `process.env` (envalid-style API).
 * Result keys match the spec (typically UPPER_SNAKE) — no remapping layer.
 */
export function loadEnv<S extends Specs>(
  specs: S,
  options: LoadEnvOptions = {}
): InferEnv<S> {
  config({ path: options.path ?? ".env" });

  const result = {} as InferEnv<S>;
  const errors: string[] = [];

  for (const key of Object.keys(specs) as (keyof S & string)[]) {
    try {
      result[key] = specs[key].parse(
        key,
        process.env[key]
      ) as InferEnv<S>[typeof key];
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    const hint = options.hint ? ` ${options.hint}` : "";
    throw new Error(
      `Invalid environment variables.${hint}\n${errors.join("\n")}`
    );
  }

  return result;
}
