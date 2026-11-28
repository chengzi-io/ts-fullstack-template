import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

const WEB_RESTRICTED_PATHS = [
  {
    allowImportNames: ["AppRouter", "RouterInputs", "RouterOutputs"],
    message:
      "apps/web may only type-import AppRouter / RouterInputs / RouterOutputs from @workspace/api.",
    name: "@workspace/api",
  },
];

const WEB_SERVER_ONLY_PATTERN = {
  group: [
    "@workspace/db",
    "@workspace/db/**",
    "@workspace/api/**",
    "@workspace/*/router",
    "@workspace/*/schema",
    "@workspace/*/repo",
    "@workspace/kernel",
    "@workspace/kernel/context",
    "@workspace/kernel/errors",
    "@workspace/kernel/testing",
    "@workspace/kernel/trpc",
  ],
  message:
    "Server-only — apps/web uses module contracts (@workspace/<module>/contract) and reaches the server through tRPC.",
};

const WEB_FEATURE_CROSS_PATTERN = {
  group: [
    "@/features/*/components/**",
    "@/features/*/hooks.ts",
    "@/features/*/model/**",
  ],
  message:
    "Reach another feature only through its api.ts (query options) or store.ts (actions).",
};

const WEB_FEATURE_ESCAPE_MESSAGE =
  "Cross-feature and shared imports must use @/ paths rather than escaping the feature folder with relative imports.";

const MODULE_RESTRICTED_PATTERNS = [
  {
    group: ["@workspace/*/router"],
    message:
      "A module never calls another module's router — use its contract or schema.",
  },
  {
    group: ["@workspace/api", "@workspace/api/**"],
    message: "Modules sit below the composition in @workspace/api.",
  },
];

export default defineConfig({
  extends: [core, react, tanstack, vitest, shadcn],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // shadcn (CLI / monorepo shared package)
    "packages/ui/src/components/**",
    "packages/ui/src/lib/**",
    "packages/ui/src/hooks/**",
    "**/src/components/ui/**",
    "**/components/theme-provider.tsx",
    // codegen & generated artifacts
    "**/src/gen/**",
    "**/graphql-env.d.ts",
    "**/graphql-env.ts",
    "**/prisma/generated/**",
    "**/drizzle/meta/**",
  ],
  jsPlugins: shadcn.jsPlugins,
  rules: {
    // Allow idiomatic `function` declarations alongside arrow expressions.
    "func-style": "off",
    // Small related domain errors (`packages/kernel/src/errors.ts`) live in one file.
    "max-classes-per-file": "off",
    // False positives on `await next()` in Hono and tRPC middleware.
    "node/callback-return": "off",
    // Wrapping Node callback/timer APIs (e.g. `server.close`, `setTimeout`) needs `new Promise`.
    "promise/avoid-new": "off",
    // Flags any `(err, ...)` callback, including Hono `app.onError` and `server.close`.
    "promise/prefer-await-to-callbacks": "off",
    // Match `export function Component()` declarations across the codebase.
    "react/function-component-definition": "off",
    // Forwarding `field.onChange` (RHF) and `handlers.on*` props is idiomatic.
    "react/jsx-handler-names": "off",
  },
  overrides: [
    {
      files: [
        "**/*.{test,spec,test-d,spec-d}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
        "**/__tests__/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
      ],
      plugins: ["vitest"],
      rules: {
        // test() everywhere: the preset keeps it() inside describe, but one
        // name reads plainer.
        "vitest/consistent-test-it": [
          "error",
          { fn: "test", withinDescribe: "test" },
        ],
        // Integration tests assert across a whole user flow (>5 expects).
        "vitest/max-expects": "off",
        // `.toBe(false)` is stricter than `.toBeFalsy()`.
        "vitest/prefer-to-be-falsy": "off",
        // `.toBe(true)` is stricter than `.toBeTruthy()`.
        "vitest/prefer-to-be-truthy": "off",
        // Root AGENTS.md: keep suites flat.
        "vitest/require-top-level-describe": "off",
      },
    },
    // Overrides replace (not merge) rule options for the same rule, so more
    // specific overrides repeat the restrictions of the broader ones.
    {
      files: ["apps/web/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: WEB_RESTRICTED_PATHS,
            patterns: [WEB_SERVER_ONLY_PATTERN],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/components/blocks/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: WEB_RESTRICTED_PATHS,
            patterns: [
              WEB_SERVER_ONLY_PATTERN,
              {
                group: [
                  "@/features/**",
                  "@/routes/**",
                  "@/components/layout/**",
                ],
                message:
                  "Blocks are domain-free reusable UI and may only depend downward on @workspace/ui, hooks, and lib.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/components/layout/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: WEB_RESTRICTED_PATHS,
            patterns: [
              WEB_SERVER_ONLY_PATTERN,
              {
                group: ["@/routes/**"],
                message:
                  "Layout shells sit below routes and may not import from routes/.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/features/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: WEB_RESTRICTED_PATHS,
            patterns: [WEB_SERVER_ONLY_PATTERN, WEB_FEATURE_CROSS_PATTERN],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/features/*/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: WEB_RESTRICTED_PATHS,
            patterns: [
              WEB_SERVER_ONLY_PATTERN,
              WEB_FEATURE_CROSS_PATTERN,
              {
                group: ["../*", "../**"],
                message: WEB_FEATURE_ESCAPE_MESSAGE,
              },
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/features/*/*/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: WEB_RESTRICTED_PATHS,
            patterns: [
              WEB_SERVER_ONLY_PATTERN,
              WEB_FEATURE_CROSS_PATTERN,
              {
                group: ["../../*", "../../**"],
                message: WEB_FEATURE_ESCAPE_MESSAGE,
              },
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/routes/**"],
      rules: {
        // TanStack Router declares `export const Route = createFileRoute(...)({ component: Page })`
        // above `function Page()`, which references `Route.useSearch()` / `Route.useNavigate()`.
        "no-use-before-define": ["error", { functions: false }],
        "no-restricted-imports": [
          "error",
          {
            paths: WEB_RESTRICTED_PATHS,
            patterns: [
              WEB_SERVER_ONLY_PATTERN,
              {
                group: ["@/features/*/model/**"],
                message:
                  "Routes use a feature's components, hooks.ts, store.ts (and api.ts only inside an opt-in route loader) — never its model/.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["modules/*/src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: MODULE_RESTRICTED_PATTERNS,
          },
        ],
      },
    },
    {
      files: ["modules/*/src/contract.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              ...MODULE_RESTRICTED_PATTERNS,
              {
                group: [
                  "node:*",
                  "drizzle-orm",
                  "drizzle-orm/**",
                  "@trpc/server",
                  "@workspace/db",
                  "@workspace/db/**",
                  "@workspace/*/schema",
                  "@workspace/*/repo",
                  "@workspace/kernel/context",
                  "@workspace/kernel/errors",
                  "@workspace/kernel/testing",
                  "@workspace/kernel/trpc",
                  "./schema",
                  "./schema.js",
                  "./repo",
                  "./repo.js",
                  "./router",
                  "./router.js",
                ],
                message:
                  "contract.ts ships to the browser — Zod shapes and types only.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["modules/*/src/router.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              ...MODULE_RESTRICTED_PATTERNS,
              {
                group: [
                  "drizzle-orm",
                  "drizzle-orm/**",
                  "@workspace/db",
                  "@workspace/db/**",
                  "@workspace/*/schema",
                  "@workspace/*/repo",
                  "./schema",
                  "./schema.js",
                ],
                message: "Routers reach data only through their module's repo.",
              },
            ],
          },
        ],
      },
    },
  ],
});
