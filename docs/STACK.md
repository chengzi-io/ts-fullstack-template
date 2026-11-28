# Tech stack

Installed tools and where each lives. Add a tool only in the change that installs it; versions live in `package.json`.

## Web — `apps/web`

| Tool | Role |
| --- | --- |
| React 19 | UI runtime |
| Vite | Dev server and bundler |
| TanStack Router | File-based routes; list state in URL search params |
| TanStack Query | Server state |
| tRPC client | Typed calls to `AppRouter` |
| Zustand | Client UI intent (dialogs, resume flows) — never server rows |
| React Hook Form | Form values and validation UX |
| TanStack Table | `DataTable`: one server-paged, server-searched page |
| Zod | Module contracts from `@workspace/<module>/contract` |

## Design system — `packages/ui`

| Tool                    | Role                               |
| ----------------------- | ---------------------------------- |
| shadcn/ui (`base-rhea`) | Primitives added via shadcn CLI    |
| Base UI                 | Accessible primitives under shadcn |
| Tailwind CSS v4         | Theme tokens and utilities         |
| DM Sans                 | Variable font                      |
| Lucide                  | Icons                              |

## API — `apps/server`, `packages/api`, `packages/kernel`, `modules/*`

| Tool | Role |
| --- | --- |
| Hono | HTTP host (`apps/server`) |
| tRPC 11 | `AppRouter` (`packages/api`), module routers, kernel procedures |
| SuperJSON | Dates and richer wire types |
| Zod 4 | Shared contracts |
| `@t3-oss/env-core` | Fail-fast env validation |

## Data — `packages/db`, `modules/*/src/schema.ts`

| Tool                      | Role                                             |
| ------------------------- | ------------------------------------------------ |
| Drizzle ORM / drizzle-kit | Schema, queries, `push` / `generate` / `migrate` |
| libSQL                    | Local SQLite file or Turso                       |

## Observability — `apps/server`

| Tool | Role |
| --- | --- |
| pino | JSON logs with redaction; `pino-pretty` in dev |
| OpenTelemetry | Opt-in OTLP tracing; logs in a span carry `trace_id` / `span_id` |

## Quality

| Tool | Role |
| --- | --- |
| TypeScript | Strict mode in every package |
| Oxlint + Oxfmt (Ultracite, `@shadcn/lint`) | Format, lint, import boundaries, design-system rules |
| Vitest | Unit and integration tests |
| Testing Library + jsdom | User-centric React component tests |
| MSW | Network-level tRPC mocks in web tests |
| Playwright | Critical-flow E2E test |
| axe-core | WCAG 2.1 A/AA checks during E2E |

## Repository

| Tool            | Role                                                  |
| --------------- | ----------------------------------------------------- |
| pnpm workspaces | `apps/*`, `modules/*`, `packages/*`                   |
| Turborepo       | Cached `dev`, `build`, `typecheck`, `test`            |
| lefthook        | Pre-commit fix, commit-msg lint                       |
| commitlint      | Conventional Commits                                  |
| git-cliff       | GitHub Release notes and version bumps (`cliff.toml`) |
| Dependabot      | Dependency and GitHub Actions updates                 |

## Development only — `apps/web/src/components/dev-tools.tsx`

| Tool            | Role                       |
| --------------- | -------------------------- |
| Router Devtools | Route tree and matches     |
| Query Devtools  | Cache and mutations        |
| Agentation      | UI notes → markdown for AI |
