/**
 * Frontend env — Vite only exposes import.meta.env.VITE_*.
 * Keep validation light; do not pull Node envalid into the browser bundle.
 */

const TRAILING_SLASH = /\/$/;

function readTrpcUrl(): string {
  const value = import.meta.env.VITE_TRPC_URL;
  if (typeof value === "string" && value.trim().length > 0) {
    return value.replace(TRAILING_SLASH, "");
  }
  return "/trpc";
}

export const env = {
  VITE_TRPC_URL: readTrpcUrl(),
} as const;
