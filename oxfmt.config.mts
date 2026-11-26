import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    // shadcn (CLI / monorepo shared package)
    "packages/ui/src/components/**",
    "packages/ui/src/lib/**",
    "packages/ui/src/hooks/**",
    "**/src/components/ui/**",
    "**/components/theme-provider.tsx",
    // drizzle journal metadata
    "**/drizzle/meta/**",
  ],
});
