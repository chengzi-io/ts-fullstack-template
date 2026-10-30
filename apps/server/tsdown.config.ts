import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    // Workspace packages export TypeScript sources; Node cannot run them.
    alwaysBundle: [/^@workspace\//u],
    // Native driver binaries load from node_modules at runtime.
    neverBundle: ["@libsql/client"],
    // Their own dependencies (drizzle-orm, superjson) are bundled with them;
    // a whitelist would make every new module dependency edit this file.
    onlyBundle: false,
  },
  entry: ["src/index.ts"],
  // `start`, the smoke test, and the Docker image run dist/index.js.
  fixedExtension: false,
  sourcemap: true,
  target: "node24",
});
