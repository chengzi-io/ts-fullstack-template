# tRPC / DB / Server 准生产实施计划

## 目标

把当前模板从“开发期可运行”提升为“准生产可落地”：具备稳定的错误契约、集成测试、CI、运行时配置保护、资源关闭和部署说明，同时保持模板精简、领域无关。

本计划只覆盖：

- `apps/server`
- `packages/api`
- `packages/db`

不覆盖 Web 功能、产品业务、具体认证方案或云平台部署脚本。

## 已确定的架构决策

### 1. 模板不提交 demo migration

`packages/db/drizzle/` 保留为空目录（仅 `.gitkeep`）是刻意设计，不是缺失。


原因：

- `authors` / `posts` 是可删除 demo，用户开始真实项目时应移除（见 `docs/REMOVE-DEMO.md`）。
- 为 demo 生成 migration 会制造随后必须删除的历史污染。
- 模板不应假设用户最终采用 demo schema。

约定流程：

```text
克隆模板
→ 使用 db:push 运行 disposable authors/posts demo
→ 添加真实领域 schema
→ 删除 demo tRPC 模块与 DB schema（docs/REMOVE-DEMO.md）
→ schema 稳定后生成项目自己的首个 migration
→ 后续环境只使用 db:migrate
```

模板测试不得依赖仓库内 migration。DB/tRPC 集成测试使用临时 SQLite 文件，并通过当前 Drizzle schema 做临时 `push`；测试结束后删除文件，不向 `packages/db/drizzle/` 写入内容。


### 2. 模板不内置 Auth

模板保留 `protectedProcedure` 扩展位置，但不选择 Session、JWT、OAuth 或 RBAC 实现。具体产品在接入 Auth 时补充身份、授权、CSRF 和 credential CORS 策略。

### 3. Testing Trophy

测试以集成为主：

- Static：TypeScript、Ultracite、构建。
- Integration：`app.request()`、`appRouter.createCaller()`、临时真实 SQLite。
- Unit：只覆盖环境解析、schema refine、shutdown 等纯逻辑。
- E2E：等 Web 接入 tRPC 后再加入，不属于本计划。

Phase 1 只提交测试框架、目录、命令和 AI 约定，不提交针对 disposable demo 的测试代码。Phase 1 可以创建临时 demo 测试做验收，但验证成功后必须删除。后续 Phase 为真实准生产行为增加的测试应正常提交。

### 4. 唯一契约路径

- Web 与 Server 之间使用 tRPC。
- 不为相同领域增加平行 REST CRUD。
- `packages/api` 不读取环境变量、不创建 DB 单例；浏览器运行时只消费 `schemas/*` 子路径。
- `packages/db` 不依赖 Hono、tRPC 或应用配置。

## 依赖顺序

```text
测试运行器与临时数据库
        │
        ├── Server HTTP 契约测试
        └── tRPC + DB 集成测试
                │
                ├── 错误契约与输入硬化
                └── DB client 生命周期
                        │
                        ├── shutdown / timeout
                        └── CI 与生产运行文档
```

## Phase 1：验证基础

### Task 1：建立测试运行骨架

**说明：** 引入统一测试运行器、Turbo 任务、包级脚本、空 `test/` 目录和测试 TypeScript 配置。使用 `--passWithNoTests` 保证模板在没有 demo 测试时仍可验证工具链。

**验收标准：**

- [x] 根目录存在 `pnpm test`，Turbo 能运行 workspace 测试。
- [x] Server、tRPC、DB 都有 `test`、`test:watch` 和测试类型检查入口。
- [x] 三个包都有保留用的空 `test/` 目录。
- [x] 仓库最终不包含 disposable demo 的 `*.test.ts`。

**验证：**

```bash
pnpm --filter server test
pnpm test
pnpm typecheck
pnpm check
```

**依赖：** 无。

**可能涉及文件：**

- `package.json`
- `turbo.json`
- `apps/server/package.json`
- `packages/api/package.json`
- `packages/db/package.json`
- `apps/server/tsconfig.test.json`
- `packages/api/tsconfig.test.json`
- `packages/db/tsconfig.test.json`

**预计范围：** 跨 workspace 机械配置，包含 3 个空测试目录。

### Task 2：固化 AI 测试与 migration 约定

**说明：** 在根、Server、tRPC、DB 的 `AGENTS.md` 中写明后续 AI 必须遵守的测试位置、测试层级、数据库隔离、清理方式和模板 migration 策略。

**验收标准：**

- [x] 根约定定义 Vitest、Testing Trophy、命令和临时测试删除规则。
- [x] Server 约定要求 `createApp` + `app.request()`，禁止监听真实端口或读取开发环境。
- [x] tRPC 约定要求 `createCaller()` + 真实 Context，禁止 mock 整个 tRPC/Drizzle 栈。
- [x] DB 约定要求临时 SQLite、完整清理，并明确 demo 不生成 migration。

**验证：**

```bash
rg -n "## Testing|Template migration policy" AGENTS.md apps/server/AGENTS.md packages/api/AGENTS.md packages/db/AGENTS.md
```

预期 `packages/db/drizzle` 仍只有 `.gitkeep`。


**依赖：** Task 1。

**可能涉及文件：**

- `AGENTS.md`
- `apps/server/AGENTS.md`
- `packages/api/AGENTS.md`
- `packages/db/AGENTS.md`

**预计范围：** 中，约 3-5 个文件。

### Task 3：用临时 demo 测试验收骨架并删除

**说明：** 临时创建最小 Vitest 文件，分别验证 Server、tRPC、DB 的运行、发现和类型检查链路。测试成功后删除这些文件，只留下骨架。

**验收标准：**

- [x] 三个包的临时测试都被 Vitest 发现并成功运行。
- [x] `pnpm test` 能通过 Turbo 执行三个包。
- [x] 删除临时测试后，三个包使用 `--passWithNoTests` 仍通过。
- [x] 最终工作树没有 `*.test.ts`，`drizzle/` 仍只有 `.gitkeep`。


**验证：**

```bash
pnpm test
pnpm typecheck
pnpm check
pnpm build
rg --files -g "*.test.ts"
```

**依赖：** Task 2。

**可能涉及文件：**

- `apps/server/test/scaffold.test.ts`（临时，验证后删除）
- `packages/api/test/scaffold.test.ts`（临时，验证后删除）
- `packages/db/test/scaffold.test.ts`（临时，验证后删除）

**预计范围：** 中，约 3-5 个文件。

### Checkpoint A：验证基础完成

- [x] `pnpm test` 在无测试文件时可重复通过。
- [x] 根与三个包的 `AGENTS.md` 都包含对应测试规则。
- [x] 工作树无临时测试、DB 或 migration 文件。
- [x] `pnpm typecheck && pnpm check && pnpm build` 通过。

## Phase 2：错误与输入契约

### Task 4：统一 Server HTTP 错误与 Request ID

**说明：** 让 Server 错误响应保持正确状态码，并让所有成功/失败响应都能关联请求日志。

**验收标准：**

- [x] `HTTPException` 保留预期状态码，不被统一转换为 500。
- [x] 未知异常返回稳定的内部错误 shape，不泄漏堆栈或 SQL。
- [x] 所有响应包含 `X-Request-Id`，错误 JSON 中的 requestId 与 header 一致。
- [x] access log、错误日志和响应使用同一个 requestId。

**验证：**

```bash
pnpm --filter server test
pnpm --filter server typecheck
```

**依赖：** Task 1。

**可能涉及文件：**

- `apps/server/src/app.ts`
- `apps/server/src/app.test.ts`
- `apps/server/src/middleware/request-id.ts`

**预计范围：** 中，约 3-5 个文件。

### Task 5：统一 tRPC 错误格式与 procedure 日志

**说明：** 在 `packages/api/src/trpc.ts` 建立稳定错误格式，并使用 Context logger 记录 procedure 级运行信息。

**验收标准：**

- [x] `errorFormatter` 输出 tRPC code、requestId 和安全的校验错误信息。
- [x] logging middleware 记录 path、type、durationMs、requestId 和结果状态。
- [x] 预期业务错误不记录为未处理异常。
- [x] 日志不包含完整敏感 input、auth token 或 SQL。

**验证：**

```bash
pnpm --filter @workspace/api test
pnpm --filter server test
```

**依赖：** Task 3、Task 4。

**可能涉及文件：**

- `packages/api/src/trpc.ts`
- `packages/api/src/context.ts`
- `packages/api/src/trpc.test.ts`
- `packages/api/src/router/todos.test.ts`

**预计范围：** 中，约 3-5 个文件。

### Task 6：硬化 Todo 输入与 service 错误

**说明：** 用 disposable Todo 领域示范输入边界和一致错误映射，不引入产品级业务规则。

**验收标准：**

- [x] title、description 有明确最大长度。
- [x] dueAt 明确定义可接受格式，不使用无边界 coercion。
- [x] service/DB 失败转换为明确的 `TRPCError` 或受控内部错误。
- [x] 所有边界均通过临时集成验收，客户端错误 shape 稳定；验收测试已按模板策略删除。

**验证：**

```bash
pnpm --filter @workspace/api test
pnpm typecheck
pnpm check
```

**依赖：** Task 3、Task 5。

**可能涉及文件：**

- `packages/api/src/schemas/todos.ts`
- `packages/api/src/router/todos.ts`
- `packages/api/src/router/todos.test.ts`

**预计范围：** 中，约 3-5 个文件。

### Checkpoint B：契约稳定

- [x] HTTP 与 tRPC 错误均包含可关联 requestId。
- [x] 4xx、5xx 状态和日志级别符合预期。
- [x] 无内部堆栈、SQL 或配置值泄漏。
- [x] Todo 临时集成验收全部通过，验收测试已删除。

## Phase 3：配置与资源生命周期

### Task 7：消除 cwd 依赖并增加生产配置保护

**说明：** 环境文件和默认 SQLite 路径应相对应用位置解析，避免从 monorepo 根、server 目录或构建目录启动时指向不同文件。

**验收标准：**

- [x] `.env` 与默认 DB URL 不依赖 `process.cwd()`。
- [x] `NODE_ENV`、`LOG_LEVEL` 使用枚举校验。
- [x] production 下缺少显式 DB 配置时启动失败，不静默使用 demo 本地库。
- [x] 错误信息说明缺少哪个变量，但不打印 secret。

**验证：**

```bash
pnpm --filter server test
pnpm --filter server build
```

补充从仓库根、`apps/server`、`apps/server/dist` 三种 cwd 启动配置测试。

**依赖：** Task 1。

**可能涉及文件：**

- `apps/server/src/env.ts`
- `apps/server/test/phase3.test.ts`（临时，验证后删除）
- `apps/server/.env.example`

**预计范围：** 中，约 3-5 个文件。

### Task 8：扩展 DB client 配置与关闭能力

**说明：** 支持远程 libSQL 的认证配置，并为进程 shutdown 暴露明确的关闭能力。

**验收标准：**

- [x] DB client 接收结构化配置，而不是只有 URL。
- [x] 支持可选 auth token，且 token 不进入日志或错误响应。
- [x] 暴露幂等的 close 能力。
- [x] 本地 SQLite、临时测试 DB、远程 libSQL 使用同一类型安全入口。

**验证：**

```bash
pnpm --filter @workspace/db test
pnpm --filter @workspace/db typecheck
pnpm --filter server test
```

**依赖：** Task 2、Task 7。

**可能涉及文件：**

- `packages/db/src/index.ts`
- `packages/db/src/client.test.ts`
- `apps/server/src/db.ts`
- `apps/server/src/env.ts`
- `apps/server/.env.example`

**预计范围：** 中，约 4-5 个文件。

### Task 9：实现幂等 shutdown 与 Node HTTP timeout

**说明：** 把关闭流程提取为可测试协调器，按顺序停止接收请求、等待连接关闭、关闭 DB，并设置强制超时。

**验收标准：**

- [x] 重复 SIGINT/SIGTERM 不会重复关闭资源或重复调用 `process.exit`。
- [x] 正常关闭和超时关闭具有明确退出码和日志。
- [x] DB close 在退出前执行。
- [x] 配置 `requestTimeout`、`headersTimeout`、`keepAliveTimeout`。
- [x] `unhandledRejection`、`uncaughtException` 被记录并进入同一关闭路径。

**验证：**

```bash
pnpm --filter server test
pnpm --filter server build
```

使用临时测试验收 shutdown 顺序、重复信号和超时路径，验证后按模板策略删除。

**依赖：** Task 4、Task 8。

**可能涉及文件：**

- `apps/server/src/index.ts`
- `apps/server/src/lib/shutdown.ts`
- `apps/server/src/lib/shutdown.test.ts`
- `apps/server/src/env.ts`

**预计范围：** 中，拆成两个提交，每个约 3-5 个文件。

### Checkpoint C：运行时安全

- [x] 从不同 cwd 启动使用同一配置来源。
- [x] production 不会误用 demo 本地 DB。
- [x] SIGINT、SIGTERM、未处理异常都能关闭 HTTP 与 DB。
- [x] timeout 和强制退出路径已通过临时自动化验收，测试已删除。

## Phase 4：CI 与模板交付

### Task 10：建立 CI 门禁

**说明：** CI 验证静态检查、集成测试和构建，但不生成或提交 demo migration。

**验收标准：**

- [ ] CI 使用锁定的 pnpm 版本和 `--frozen-lockfile`。
- [ ] CI 运行 `check`、`typecheck`、`test`、`build`。
- [x] 构建后的 Server 可由 `node apps/server/dist/index.js` 直接启动，不依赖 `tsx` 或 workspace TypeScript 源码。
- [ ] tRPC/DB 测试使用临时 DB，不访问开发或远程数据库。
- [ ] CI 结束时 `packages/db/drizzle` 仍只有 `.gitkeep`。


**验证：**

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

**依赖：** Checkpoint A、Checkpoint B、Checkpoint C。

**可能涉及文件：**

- `.github/workflows/ci.yml`
- `apps/server/package.json`
- `packages/api/package.json`
- `packages/db/package.json`
- `package.json`
- `turbo.json`

**预计范围：** 中，约 4-6 个文件。

### Task 11：完善 DB 使用契约文档

**说明：** 明确区分模板 demo 阶段和真实项目 migration 阶段，防止用户错误提交 Todo migration 或在生产执行 `push`。

**验收标准：**

- [ ] README/SETUP 明确模板仓库没有 migration 是设计行为。
- [ ] 文档包含“删除 todos → 添加真实 schema → 生成首个 migration”的顺序。
- [ ] 明确本地迭代用 `db:push`，共享/CI/生产用 `db:migrate`。
- [ ] 说明备份、恢复和 migration 回滚由具体项目补齐。

**验证：**

人工按文档从干净 clone 启动 demo，再模拟移除 Todo 并生成首个 migration。

**依赖：** Task 2、Task 8。

**可能涉及文件：**

- `packages/db/AGENTS.md`
- `SETUP.md`
- `README.md`

**预计范围：** 小，约 2-3 个文档文件。

### Task 12：补齐 Server 生产运行说明并清理临时 backlog

**说明：** 文档化构建产物、环境变量、探针、反向代理、信号、超时和日志约定；完成后删除临时 backlog。

**验收标准：**

- [ ] 文档给出 `build`、`start` 和 migration 发布阶段的明确顺序。
- [ ] 文档列出必需/可选环境变量及 secret 处理方式。
- [ ] 文档说明 `/healthz`、`/readyz`、Request ID 和关闭时序。
- [ ] `docs/TEMP-PROD-BACKLOG.md` 中未完成事项已实现、迁移或明确取消，然后删除该文件。

**验证：**

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

**依赖：** Task 10、Task 11。

**可能涉及文件：**

- `apps/server/README.md`
- `apps/server/.env.example`
- `docs/TEMP-PROD-BACKLOG.md`
- `docs/PRE-PRODUCTION-PLAN.md`

**预计范围：** 小，约 3-4 个文档文件。

### Checkpoint D：准生产模板完成

- [ ] 干净 clone 可按文档启动 demo。
- [ ] 所有静态、测试和构建门禁在 CI 中通过。
- [ ] 测试与 CI 不生成 demo migration。
- [ ] 生产配置误用会 fail fast。
- [ ] HTTP、tRPC、DB 错误可通过 requestId 关联。
- [ ] Server 能幂等关闭 HTTP 与 DB 资源。
- [ ] 用户能按文档替换 Todo 并生成自己的首个 migration。

## 明确不纳入本计划

- 具体 Auth、Session、JWT、OAuth、RBAC 实现。
- Todo demo migration。
- 与 tRPC 重复的 REST CRUD。
- 产品级审计日志、事件总线、任务队列。
- 默认绑定某个云平台、容器平台或反向代理。
- 在没有真实流量目标前预设应用内限流参数。
- 完整 OpenTelemetry、Prometheus 或 APM 集成。
- Web E2E 测试。

这些能力应在真实产品需求确定后，以独立 vertical slice 加入。

## 风险与控制

### 测试 schema 与真实 schema 漂移

控制：测试数据库从当前 Drizzle schema 临时 `push`，不维护第二份手写 DDL。

### 错误 formatter 改变客户端类型

控制：先建立错误契约测试，再修改 formatter；一次性完成 Server/tRPC 两端的 requestId 对齐。

### shutdown 测试误退出测试进程

控制：关闭协调器接收注入的 `exit`、timer、server close 和 DB close 函数，测试中不直接调用真实 `process.exit`。

### 远程 libSQL 配置泄漏

控制：配置类型区分 URL 与 token，logger 只记录数据库类型/主机等非敏感元数据。

### Drizzle RC 版本变化

控制：保持精确版本；升级必须单独执行 schema、push、client 与集成测试，不和其他功能改动混合。

## 执行原则

- 每个 Task 单独实现、单独验证，不跨阶段顺手重构。
- 每完成 2-3 个 Task 执行对应 Checkpoint。
- 先写失败测试，再修改行为。
- 保持 `packages/db/drizzle/` 无 demo migration。
- 所有新增抽象必须服务于测试、生命周期或边界安全，不为目录对称而创建。
