# @workspace/ui

Shared shadcn primitives on **Base UI**. Style, aliases, and CSS entry live in `components.json` (`base-rhea`, Tailwind v4, `src/styles/globals.css`). Import primitives from `@workspace/ui/components/<name>`; feature usage rules live in `apps/web/AGENTS.md`.

## Adding a primitive

```bash
cd packages/ui && pnpm exec shadcn add <name>
```

Always run inside `packages/ui`, never from the repo root, so the CLI reads this package's `components.json`. Because Oxlint and Oxfmt ignore `packages/ui/src/{components,lib,hooks}`, `pnpm check` does not verify CLI output.

Verify the generated diff after every add:

- `cn` imports from `@workspace/ui/lib/utils` (not `"cn"`).
- No unexpected packages were added to `package.json` or `pnpm-lock.yaml` (`git diff package.json pnpm-lock.yaml`).
- Cross-primitive imports use `@workspace/ui/components/<name>`.

## Changing a primitive

Edit primitives here only for workspace-wide design-system changes. For feature one-offs, extend via `cva` variants (`VariantProps`) or composition at the call site.

```bash
pnpm --filter @workspace/ui typecheck
```
