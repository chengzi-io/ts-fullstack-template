# @workspace/ui

Shared shadcn primitives on **Base UI** — the design system every app draws from. Style, aliases and the CSS entry come from `components.json` (`base-rhea`, Tailwind v4, `src/styles/globals.css`). Import a primitive as `@workspace/ui/components/<name>`; **how** features use them is `apps/web/AGENTS.md`.

## Adding a primitive

```bash
cd packages/ui && pnpm exec shadcn add <name>
```

Run it inside this package, never from the root — the CLI reads this `components.json` for aliases and paths. Oxlint and Oxfmt do not check generated primitives (`oxlint.config.mts` / `oxfmt.config.mts` ignore `packages/ui/src/{components,lib,hooks}`), so the CLI's output is unverified by `pnpm check`.

**Read what the CLI wrote.** It has gone wrong before:

- `cn` must come from `@workspace/ui/lib/utils`; the CLI once emitted `import { cn } from "cn"`
- `package.json` and the lockfile must not gain packages you did not ask for — that same run installed an unrelated npm package named `cn` (`git diff package.json pnpm-lock.yaml` after every add)
- imports of other primitives use `@workspace/ui/components/<name>`

## Changing a primitive

Only to change the design system for everyone. A one-off in a feature is a `cva` variant (`VariantProps`) or composition on the caller's side — never a fork here.

```bash
pnpm --filter @workspace/ui typecheck
```
