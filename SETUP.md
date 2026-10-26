**DO NOT COMMIT THIS FILE**

## Step1 init via shadcn/ui - template vite

TS (strict) + React + Vite + Tailwind CSS V4 + shadcn/ui + monorepo（Turborepo）

```bash
pnpm dlx shadcn@latest init --preset b27Gct3w --template vite --monorepo --pointer
```


## Step2 Replace ESLint + prettier by Ultracite（Biome + Lefthook）

- Clean ESLint + prettier
- Init Ultracite（At project root, no need add to `turbo.json`）

```bash
pnpm dlx ultracite init \
--pm pnpm \
--linter biome \
--editors universal zed \
--frameworks react tanstack vitest \
--integrations lefthook \
--quiet
```

> Skip `--type-aware`: Biome project scanner often false-positives in pnpm monorepos; use `pnpm typecheck` instead.

add biome ignore patterns

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    "ultracite/biome/core",
    "ultracite/biome/react",
    "ultracite/biome/tanstack",
    "ultracite/biome/vitest"
  ],
  // Only negations: core already provides "**" (re-adding it fails noBiomeFirstException).
  "files": {
    "includes": [
      // shadcn (CLI / monorepo shared package)
      "!packages/ui/src/components",
      "!packages/ui/src/lib",
      "!packages/ui/src/hooks",
      "!**/src/components/ui",
      "!**/components/theme-provider.tsx",
      // codegen & generated artifacts
      "!**/src/gen",
      "!**/src/generated",
      "!**/src/__generated__",
      "!**/*.gen.ts",
      "!**/*.gen.tsx",
      "!**/*.generated.ts",
      "!**/*.generated.tsx",
      "!**/routeTree.gen.ts",
      "!**/graphql-env.d.ts",
      "!**/graphql-env.ts",
      "!**/prisma/generated",
      "!**/drizzle/meta"
    ]
  }
}
```

`lefthook.yml` 将 ` pnpm dlx ultracite fix` 改为 `pnpm fix`:

```yml
pre-commit:
  jobs:
    - run: pnpm fix
      glob:
        - "**/*.js"
        - "**/*.jsx"
        - "**/*.ts"
        - "**/*.tsx"
        - "**/*.json"
        - "**/*.jsonc"
        - "**/*.css"
      stage_fixed: true
```

## Step3 init backend Hono - at `apps/api`

```bash
pnpm create hono@latest apps/api --template nodejs --pm pnpm --install

# 单独跑
# pnpm --filter api dev
# 和前端一起
# pnpm dev
```

> 后续 Step5 会将宿主改名为 `apps/server`，并把业务 RPC 抽到 `packages/api`。Step3 只需得到可跑的 Hono 空壳即可。

### Step4 Drizzle + SQLite (libsql) — `packages/db`

目标：在 monorepo 里单独落地数据层包 **`@workspace/db`**（schema / migrations / kit 只在这里）。  

此步**不**改 `apps/api`：Step3 的 api 仍是 Hono 空壳；运行时 `createDb`、env、业务表接入留给后续步骤。  
细节与边界见 `packages/db/AGENTS.md`。

#### 4.1 建包骨架

```bash
mkdir -p packages/db/src/schema packages/db/drizzle
```

在 `packages/db/package.json` 中至少包含：

- `name`: `@workspace/db`
- `exports`:
  - `"."` → `./src/index.ts`
  - `"./schema/*"` → `./src/schema/*.ts`
- scripts: `db:generate` / `db:migrate` / `db:push` / `db:studio` / `db:check` / `db:pull` / `typecheck`
- deps: `drizzle-orm@rc`、`@libsql/client`（**不需要** dotenv 包：kit 用 Node `--env-file-if-exists=.env`；本包持有 `DATABASE_*` 的 `.env.example`）
- devDeps: `drizzle-kit@rc`、`typescript`、`@types/node`

再补：

| 文件 | 作用 |
|------|------|
| `packages/db/tsconfig.json` | NodeNext + `noEmit` |
| `packages/db/src/index.ts` | `createDb()`（读 `process.env.DATABASE_URL` / `DATABASE_AUTH_TOKEN`，**不**加载 dotenv、**不**做 process 单例，暴露幂等 `close()`） |
| `packages/db/src/schema/todos.ts` | **模板演示表**（本包可独立 push/generate）；正式开发用自己的 domain 替换/删除，不必保留 todo |
| `packages/db/drizzle.config.ts` | `schema: "./src/schema/*.ts"`，`out: "./drizzle"`，`dialect: "turso"`（本地 file + 远程 Turso） |
| `packages/db/AGENTS.md` | 所有权 / 扩表配方（给 agent 与人类） |

原则：**谁拥有 schema，谁拥有 migration 与 `db:*`。** 根上与 `apps/api` 都不要再装第二套 drizzle-kit。本包**不**持有 `.env` / `.env.example`（运行时 env 在 `apps/server`）。

#### 4.2 安装并配置 kit 环境

在仓库根：

```bash
pnpm install
# DATABASE_* 归 packages/db（复制 .env.example → .env）
cp packages/db/.env.example packages/db/.env
# 或 shell / CI 覆盖：
# DATABASE_URL=libsql://….turso.io DATABASE_AUTH_TOKEN=… pnpm db:push
```

`drizzle.config.ts` **要求** `process.env.DATABASE_URL`（可选 `DATABASE_AUTH_TOKEN`）；缺失则抛错，无默认 URL。本地先 `cp packages/db/.env.example packages/db/.env`。`db:*` scripts 用 Node `--env-file-if-exists=.env`（本包）注入；**不**使用 dotenv 包。`apps/server` 通过叠加 `--env-file-if-exists=../../packages/db/.env` 读取同一连接配置，server 自己的 `.env` **不写** `DATABASE_*`。
根 `package.json` 加代理（方便在根目录敲）：

```json
{
  "scripts": {
    "db:generate": "pnpm --filter @workspace/db db:generate",
    "db:migrate": "pnpm --filter @workspace/db db:migrate",
    "db:push": "pnpm --filter @workspace/db db:push",
    "db:studio": "pnpm --filter @workspace/db db:studio",
    "db:check": "pnpm --filter @workspace/db db:check"
  }
}
```

#### 4.3 第一次把 schema 落到本地库

**开发迭代中优先 `push`**（不写 migration 文件，改表快）：

```bash
pnpm db:push
```

表结构相对稳定后，再生成可提交的 migration（团队 / CI / 生产靠这个）：

```bash
pnpm db:generate    # 产出 packages/db/drizzle/** —— 提交 git
pnpm db:migrate     # 校验可应用
pnpm db:check
```

| 场景 | 用 |
|------|----|
| 本地猛改表、还没定型 | `pnpm db:push` |
| 定型、要给别人/CI/生产 | `pnpm db:generate` → 提交 `drizzle/` → `pnpm db:migrate` |
| 新机器 / CI 只有已有 migration | 只 `pnpm db:migrate`（不要用 push 当唯一真相） |

本地库文件 `*.db` **gitignore，不入库**；`packages/db/drizzle/**` **应提交**。

#### 4.4 验收（仅 `packages/db`）

```bash
pnpm --filter @workspace/db typecheck
pnpm check       # ultracite / Biome；不通过时先 pnpm fix
pnpm db:check
# 可选：pnpm db:studio
```

之后日常扩表流程见 `packages/db/AGENTS.md` → **Adding a table**（先 `push` 迭代，稳定后再 `generate`）。  
api / tRPC 侧如何 `createDb` 与 import schema，在后续步骤再接，本步不做。

### Step5 tRPC 契约包 + 宿主 `apps/server`（不动 `apps/web`）

目标：

- **`packages/api`（`@workspace/api`）**：tRPC `appRouter`、`schemas/*` wire Zod、domain routers（FE↔BE 契约）
- **`apps/server`**：由 Step3 的 `apps/api` **改名**而来的薄宿主（env、`createDb`、CORS、`/health`、挂载 `/trpc`）
- **`apps/web`**：本步不接 client（下一步再做）

细节见 `packages/api/AGENTS.md`、`apps/server/AGENTS.md`。

#### 5.1 建 `packages/api`

```bash
mkdir -p packages/api/src/{router,schemas}
```

- deps：`@trpc/server`、`superjson`、`zod`、`@workspace/db`、`drizzle-orm`（router 内查询用）
- 关键文件：`index.ts`（`appRouter` + 类型）、`context.ts`、`trpc.ts`、`schemas/*`、`router/<domain>.ts`（demo `todos` 可删）
- exports：`"."` → `index.ts`，`"./context"` → `context.ts`，`"./schemas/*"` → 浏览器安全领域 schema
- 过程使用 `ctx.db`；需要时抽同文件 helper，**不**在本包创建 process 单例
#### 5.2 将 `apps/api` 改名为 `apps/server`

```bash
mv apps/api apps/server
# package.json name → "server"
```

削薄宿主：

- deps：`hono`、`@hono/node-server`、`@hono/trpc-server`、`@workspace/api`、`@workspace/db`、`@t3-oss/env-core`、`zod`、`pino`
- **删除** REST todos routes / 本包 schemas / services（业务进 `@workspace/api` 的 `router/*` + `schemas/*`）
- `src/app.ts`：`trpcServer({ router: appRouter, createContext: () => createTRPCContext({ db, log, requestId }) })`
- env 分层：`packages/db/.env` 拥有 `DATABASE_*`；`apps/server/.env` 只放 PORT/CORS/LOG 等；server scripts 先 load db 再 load app；校验用 `@t3-oss/env-core` + Zod（仍校验 `DATABASE_*`）

#### 5.3 验收

```bash
pnpm install
pnpm typecheck
pnpm check
pnpm --filter server dev
# GET http://localhost:3000/health
# tRPC 走 /trpc/*
```

`apps/web` 仍可只跑 UI；接 client 时再 `import type { AppRouter } from "@workspace/api"`。

---

## 前端路线图（Step6 起）

约定（与参考项目 `frontent-test` 的差异）：

| 参考项目 | 本仓库 |
|---|---|
| OpenAPI + 生成 `src/api/generated` | **tRPC**：契约在 `@workspace/api` 的 `AppRouter` |
| `src/components/ui` 本地 shadcn | **`packages/ui`** 共享 design system |
| feature 内目录叫 `ui/` | 本仓库用 **`components/`**（避免与 `@workspace/ui` 混淆） |
| REST + MSW `/api/*` | tRPC `/trpc/*`；MSW 按 procedure path mock |

定稿：

- 页面：`/` Home + `/todos` 列表 + `/todos/new` 新建
- Header tab 切换（AppShell）
- feature-based：业务在 `apps/web/src/features/*`
- E2E：`apps/web/e2e`
- `packages/ui`：仅 shadcn primitives / 主题（无业务）

| Step | 内容 | 状态 |
|------|------|------|
| **6** | Router 文件路由 + AppShell + feature 目录骨架 | ✅ 已落地 |
| **7** | tRPC client + TanStack Query（真连 `apps/server`） | ✅ 已落地 |
| **8** | Todos：Table 列表 + RHF/Zod 新建页 | ✅ 已落地 |
| **9** | MSW（前后端并行 / 离线 mock） | 待做 |
| **10** | Vitest + Testing Library（单元/集成） | 待做 |
| **11** | Playwright + axe（E2E / a11y） | 待做 |
| **12** | DEV 工具：Router/Query Devtools + Agentation | 待做 |

---

## Step6 — `apps/web`：TanStack Router + AppShell + feature 骨架

目标：只打**导航与目录**基础，**不**接 tRPC / Query / Table / Form。  
跑起来应看到 Header：`Home | Todos`，三个路由可切换；Todos 页是占位文案。

### 6.1 安装依赖

在仓库根：

```bash
pnpm --filter web add @tanstack/react-router
pnpm --filter web add -D @tanstack/router-plugin
```

本步**不要**装 `@trpc/*`、`@tanstack/react-query` 等（留给 Step7+）。

### 6.2 目标目录（本步落地）

```text
apps/web/src/
├── main.tsx                         # RouterProvider 入口
├── routeTree.gen.ts                 # 插件生成，勿手改（Biome 已 ignore）
├── components/
│   ├── theme-provider.tsx           # 已有
│   └── layout/
│       ├── app-shell.tsx            # Header tabs
│       └── page-header.tsx          # 页面标题条
├── features/
│   └── todos/
│       └── index.ts                 # 对外 barrel（本步仅占位 export）
├── routes/                          # ★ 文件路由（薄装配层）
│   ├── __root.tsx                   # ThemeProvider + AppShell + <Outlet />
│   ├── index.tsx                    # /
│   └── todos/
│       ├── index.tsx                # /todos
│       └── new.tsx                  # /todos/new
└── (删除 app.tsx — 改由路由树驱动)
```

后续 Step 会补上、本步**不建**的路径：

```text
src/lib/trpc.ts
src/providers/
src/mocks/
src/test/
e2e/
features/todos/{hooks,model,components}/
```

### 6.3 Vite：Router 插件

`apps/web/vite.config.ts`：在 `@vitejs/plugin-react` **之前**注册 `tanstackRouter`（官方要求）。

```ts
import { tanstackRouter } from "@tanstack/router-plugin/vite";

plugins: [
  tanstackRouter({ autoCodeSplitting: true, target: "react" }),
  react(),
  tailwindcss(),
],
```

保存路由文件后 dev/build 会生成 `src/routeTree.gen.ts`。

### 6.4 分层约定（本步起遵守）

| 层 | 职责 |
|----|------|
| `routes/*` | 路由定义、页面装配；**薄**，不写领域细节 |
| `features/<domain>/*` | 领域 hooks / form model / 业务组件 |
| `components/layout/*` | 跨页壳（Header、PageHeader） |
| `@workspace/ui` | shadcn primitives（Button 等） |
| `@workspace/api` | 本步**不** import（Step7 再接） |

### 6.5 验收

```bash
pnpm --filter web typecheck
pnpm check
pnpm --filter web dev
# 浏览器：
#   /           → Home
#   /todos      → Todos 占位
#   /todos/new  → New todo 占位
# Header tab 可切换；深链刷新应仍正确
```

### 6.6 理解检查（做完本步应能回答）

1. 为什么页面组件在 `routes/`，业务最终要在 `features/`？  
2. `routeTree.gen.ts` 谁生成、要不要提交？（建议**提交**，CI/clone 后无需先跑插件也能 typecheck。）  
3. `AppShell` 的 `Link` 的 `.active` 类从哪来？（TanStack Router 的 `Link` 在匹配时自动加 `active`。）

---

## Step7 — tRPC client + TanStack Query（真连后端）

目标：浏览器经 **同源 `/trpc`**（Vite proxy → `apps/server:3000`）调用已有 `AppRouter`，`/todos` 用 TanStack Query 展示 **`todos.list` 真数据**。  
本步**不做** Table 组件、RHF 表单、MSW（Step8 / Step9）。

相对 OpenAPI 参考项目：

| 参考项目 | 本步 |
|---|---|
| `src/api/generated/*` + REST | `import type { AppRouter } from "@workspace/api"` |
| `src/api/client.ts` 配 baseUrl | `src/lib/trpc.ts` + `httpBatchLink` |
| Vite proxy `/api` | Vite proxy **`/trpc`** |

### 7.1 安装依赖

```bash
pnpm --filter web add \
  @tanstack/react-query \
  @trpc/client \
  @trpc/tanstack-react-query \
  superjson \
  '@workspace/api@workspace:*'
```

- **`@trpc/tanstack-react-query`**：v11 推荐的 Query 集成（`createTRPCOptionsProxy` + `queryOptions`），不是旧的 `@trpc/react-query` hooks 全家桶。
- **`superjson`**：必须与 `packages/api` 的 `transformer` **一致**，否则 Date 等类型对不上。
- 根入口只做 **type import**（`AppRouter` / `RouterInputs` / `RouterOutputs`）；运行时 Zod 仅从 `@workspace/api/schemas/*` 导入，不拉 router/service/DB。

### 7.2 目标目录（本步新增）

```text
apps/web/
├── .env.example                 # VITE_TRPC_URL=/trpc
├── vite.config.ts               # proxy /trpc → http://localhost:3000
└── src/
    ├── env.ts                   # 读 import.meta.env.VITE_*
    ├── lib/
    │   ├── query-client.ts      # QueryClient 单例（与 trpc proxy 共用）
    │   └── trpc.ts              # createTRPCClient + createTRPCOptionsProxy
    ├── features/todos/
    │   └── hooks.ts             # useTodosQuery → trpc.todos.list
    ├── routes/__root.tsx        # QueryClientProvider
    └── routes/todos/index.tsx   # loading / error / empty / 简易列表
```

> Ultracite 禁止 barrel re-export：routes 使用  
> `import { useTodosQuery } from "@/features/todos/hooks.ts"`。

### 7.3 环境变量（仅 FE / Vite）

`apps/web/.env.example`：

```bash
# Same-origin path; Vite dev proxies to apps/server (default :3000)
VITE_TRPC_URL=/trpc
```

`src/env.ts`：默认 `VITE_TRPC_URL ?? "/trpc"`。  
生产若前后端不同源，可改为绝对 URL，并在 server 配 `CORS_ORIGIN`。

### 7.4 Vite proxy

```ts
server: {
  proxy: {
    "/trpc": {
      changeOrigin: true,
      target: "http://localhost:3000",
    },
  },
},
```

开发期浏览器只请求 `http://localhost:5173/trpc/*`，**不必**开 CORS；server 的 `CORS_ORIGIN` 留给跨源场景。

### 7.5 tRPC + Query 接线

1. `query-client.ts`：共享 `QueryClient`（`staleTime` 等默认项）。
2. `trpc.ts`：
   - `createTRPCClient<AppRouter>({ links: [httpBatchLink({ url, transformer: superjson })] })`
   - `createTRPCOptionsProxy({ client, queryClient })` → 导出 `trpc`
3. `__root.tsx`：`QueryClientProvider client={queryClient}` 包住 `AppShell`。
4. `features/todos/hooks.ts`：`useQuery(trpc.todos.list.queryOptions({}))`。

### 7.6 验收

**两个终端：**

```bash
# A — Server（确保 packages/db 已 push/migrate，有 local.db）
pnpm --filter server dev
# GET http://localhost:3000/  → server ok
# 可选：用任意 tRPC client / curl 打 /trpc/todos.list

# B — Web
pnpm --filter web typecheck
pnpm --filter web dev
# 打开 http://localhost:5173/todos
# - loading → 列表或 empty
# - Network：/trpc/todos.list* 200（经 Vite proxy）
```

可先往库里插一条 todo（Studio / 临时 mutation / SQL），确认列表出现标题。

### 7.7 理解检查

1. 为什么 FE 用 `import type { AppRouter }` 而不是复制一份 Zod HTTP 客户端？  
2. 为何 dev 用 `/trpc` + proxy，而不是默认写死 `http://localhost:3000/trpc`？  
3. `superjson` 必须两端一致的原因是什么？

---

## Step8 — Todos：Table + Form（RHF + Zod）

目标：`/todos` 用 **TanStack Table** 渲染 `todos.list`；`/todos/new` 用 **React Hook Form + Zod** 提交 `todos.create`，成功后 invalidate 列表并返回 `/todos`。  
本步**不做** MSW / 测试 / Devtools（Step9+）。

相对 OpenAPI 参考项目：

| 参考项目 | 本步 |
|---|---|
| `zCreateItemRequest` 生成 schema | FE 从 `@workspace/api/schemas/todos` 组合 `todoFormSchema` |
| `Item` 类型 from generated | `inferRouterOutputs<AppRouter>["todos"]["list"]["items"][number]` |
| `src/components/ui/*` 本地 shadcn | **`packages/ui`** 增加 table / input / field / label |

### 8.1 安装依赖

```bash
# web app
pnpm --filter web add @tanstack/react-table react-hook-form @hookform/resolvers zod

# design system（在 packages/ui 目录）
cd packages/ui
pnpm dlx shadcn@latest add table input field label --yes
```

### 8.2 目标目录

```text
packages/ui/src/components/
├── table.tsx · input.tsx · field.tsx · label.tsx · separator.tsx  # shadcn

apps/web/src/features/todos/
├── hooks.ts                         # useTodosQuery + useCreateTodoMutation
├── model/
│   └── form.ts                      # todoFormSchema / defaults / toCreateTodoInput
└── components/
    ├── columns.tsx                  # TanStack Table column defs
    ├── table.tsx                    # TodosTable
    └── form.tsx                     # TodoForm (RHF + Zod)

apps/web/src/routes/todos/
├── index.tsx                        # list + TodosTable
└── new.tsx                          # TodoForm → todos.create → navigate
```

### 8.3 关键接线

1. **`model/form.ts`**：从共享 create input 组合 FE 表单 schema；`toCreateTodoInput` 把空 description 收成 `null`。
2. **`hooks.ts`**：`useCreateTodoMutation` 用 `trpc.todos.create.mutationOptions`，`onSuccess` → `invalidateQueries` 列表 key。
3. **`columns.tsx` / `table.tsx`**：headless table + `@workspace/ui` Table primitives。
4. **`form.tsx`**：`zodResolver(todoFormSchema)`；成功 `onSubmit` 后 reset；失败保留输入。
5. **`/todos/new`**：`mutateAsync` → `navigate({ to: "/todos" })`。

> 不建 feature barrel（Ultracite `noBarrelFile`）；routes 直接 import `hooks` / `components/*` / `model/*`。

### 8.4 验收

```bash
pnpm --filter web typecheck
pnpm --filter server dev   # 终端 A
pnpm --filter web dev      # 终端 B

# 浏览器
# 1. /todos → 表格列出已有 todos（或 empty）
# 2. New todo → 填 title → Create
# 3. 回到 /todos，新行出现（Query invalidation）
# Network：todos.create + todos.list
```

### 8.5 理解检查

1. 为什么 FE 从 `@workspace/api/schemas/todos` 组合 `todoFormSchema`，但禁止 value-import `@workspace/api` 根入口？
2. Table 为什么放在 `features/todos/components` 而不是 `packages/ui`？
3. `mutateAsync` + form `await onSubmit` 如何保证失败时不 reset？

---

## Step9 — MSW（前后端并行）

> 待做。`src/mocks/*` + `VITE_ENABLE_MSW`；按 tRPC HTTP path mock `todos.*`，与真 proxy 可切换。

## Step10 — Vitest + Testing Library

> 待做。jsdom、setup、`features/todos` hooks/form 测试；`pnpm --filter web test`。

## Step11 — Playwright + axe（E2E）

> 待做。`apps/web/e2e` + `playwright.config.ts`；home / todos / a11y。

## Step12 — DEV 工具

> 待做。Router Devtools、Query Devtools、Agentation（均 `import.meta.env.DEV`）。

---

## 其他（规范）

- `apps/web` 优先使用 Vite 自带 `.env` / `VITE_*`，读 `import.meta.env`（不要照搬 server 的 t3-env 到浏览器）。

- **DO NOT COMMIT THIS FILE**（`SETUP.md` 为本地脚手架笔记）。
