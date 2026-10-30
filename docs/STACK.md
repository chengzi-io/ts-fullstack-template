# Tech stack

What the template ships with, and where each piece lives. Only what is
installed belongs here: a planned tool joins the list in the change that adds
it. Versions live in the `package.json` files, not here.

## Web — `apps/web`

| Tool | Role |
|------|------|
| React 19 | UI runtime |
| Vite | Dev server and bundler |
| TanStack Router | File-based routes; list state in URL search params |
| TanStack Query | Server state |
| tRPC client | Typed calls to `AppRouter` |
| Zustand | Client UI intent (dialogs, resume flows) — never server rows |
| React Hook Form | Form values and validation UX |
| TanStack Table | `DataTable`: one server-paged, server-searched page |
| Zod | Module contracts, imported from `@workspace/<module>/contract` |

## Design system — `packages/ui`

| Tool | Role |
|------|------|
| shadcn/ui (`base-rhea`) | Primitives, added with the shadcn CLI |
| Base UI | Accessible primitives under shadcn |
| Tailwind CSS v4 | Tokens and utilities |
| DM Sans | Variable font |
| Lucide | Icons |

## API — `apps/server`, `packages/api`, `packages/kernel`, `modules/*`

| Tool | Role |
|------|------|
| Hono | HTTP host (`apps/server`) |
| tRPC 11 | `AppRouter` (`packages/api`), module routers, kernel procedures |
| SuperJSON | Dates and richer types over the wire |
| Zod 4 | Contracts shared with the web |
| `@t3-oss/env-core` | Fail-fast environment validation |

## Data — `packages/db`, `modules/*/src/schema.ts`

| Tool | Role |
|------|------|
| Drizzle ORM / drizzle-kit | Schema, queries, `push` / `generate` / `migrate` |
| libSQL | Local SQLite file or Turso |

## Observability — `apps/server`

| Tool | Role |
|------|------|
| pino | JSON logs with redaction; `pino-pretty` in development |
| OpenTelemetry | Opt-in OTLP tracing; logs inside a span carry its trace id |

## Quality

| Tool | Role |
|------|------|
| TypeScript | Strict mode in every package |
| Biome (Ultracite preset) | Format, lint, import boundaries |
| Vitest | Unit and integration tests |
| Testing Library + jsdom | Web pages rendered like a user sees them |
| MSW | tRPC answered at the network in web tests |
| Playwright | One end-to-end test of the critical flow |
| axe-core | WCAG 2.1 A/AA checks at each step of that flow |

## Repository

| Tool | Role |
|------|------|
| pnpm workspaces | `apps/*`, `modules/*`, `packages/*` |
| Turborepo | `dev`, `build`, `typecheck`, `test` with caching |
| lefthook | Pre-commit fix, commit-msg lint |
| commitlint | Conventional Commits |
| release-please | Release PRs, tags, `CHANGELOG.md` |
| Dependabot | Dependency and GitHub Actions updates |

## Development only — `apps/web/src/components/dev-tools.tsx`

| Tool | Role |
|------|------|
| Router Devtools | Route tree and matches |
| Query Devtools | Cache and mutations |
| Agentation | UI notes → markdown for AI |
