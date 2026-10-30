import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/index.ts"],
  external: ["@libsql/client"],
  format: ["esm"],
  noExternal: [/^@workspace\//],
  platform: "node",
  sourcemap: true,
  target: "node24",
});
