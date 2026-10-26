# TEMP：server / api 准生产待办（消化用）

> **临时文档**，不是长期规范。事项做完或并入 AGENTS/README 后应删除本文件。  
> 来源：双 agent review + 你的决策。  
> 更新日期：按仓库现状。

---

## 已拍板的决策

| 议题 | 决策 |
|------|------|
| Auth / `protectedProcedure` | **不做进模板**。不同产品 auth 形态差太大，留给业务项目自选。 |
| Demo `authors`/`posts` 可写 | 接受为模板风险；文档标明 demo，**不**假装生产安全。 |
| List 无界 | **修**：默认 limit + max。 |
| 分页 | **page / pageSize / total**（后台表格）；共享 `schemas/pagination.ts`，无顶层 DEFAULT 常量。 |
| 探针路径 | **`/healthz` + `/readyz`**，**删除 `/health`**（更贴 k8s/常见约定，少维护一条兼容路径）。 |
| 测试形状 | 全仓遵循 **Testing Trophy**，不是测试金字塔。 |

---

## Testing Trophy（本仓库）

Kent C. Dodds 的奖杯：中间厚、两头薄。

```text
        ╱╲
       ╱ E2E ╲          少：关键用户路径（以后 web+server 再上）
      ╱────────╲
     ╱ Integration ╲    主仓：app.request / createCaller / 真 DB 或近真 DB
    ╱──────────────╲
   ╱  Unit（纯逻辑） ╲   适量：env 解析、纯函数 schema refine
  ╱──────────────────╲
 ╱ Static（tsc/biome） ╲  已有：typecheck + ultracite；保持
```

| 层 | 本 monorepo 怎么做 | 不做什么 |
|----|-------------------|----------|
| Static | `pnpm typecheck`、`pnpm check`、lefthook | 不靠人工当测试 |
| Integration（主力） | **server**：`createApp` + `app.request`；**api**：`createCaller` + 临时 sqlite | 不 mock 整个 Hono/tRPC 栈 |
| Unit | `createEnv`、纯 zod/helpers | 不为每个 service 行 mock drizzle |
| E2E | 暂缓到 web 接 tRPC 后 | 现在不上 Playwright 全站 |

加测试时优先 **集成**，静态继续守门；单测只覆盖「纯、稳、值得单独钉」的逻辑。

---

## 优先级一览（消化顺序）

### Now（本轮 / 紧接着）

| ID | 项 | 状态 |
|----|-----|------|
| N1 | list：page/pageSize/total 分页 | ✅ 已做（曾 cursor，已改为页码） |
| N2 | `/healthz`、`/readyz`；删除 `/health` | ✅ 已做 |
| N3 | 探针不打 access info 日志 | ✅ 已做 |
| N4 | 本文档 | ✅ 已做 |

### Next（准生产短清单，建议按序）

| ID | 项 | 包 | 备注 |
|----|-----|-----|------|
| X1 | `onError` 识别 `HTTPException` | server | ✅ 已完成 |
| X2 | cwd 锚定 `.env` + 默认 DB 绝对路径 | server | ✅ 已完成 |
| X3 | `errorFormatter` + `requestId` | api | ✅ 已完成 |
| X4 | service 统一 `TRPCError`；title/description max；dueAt 去有害 coerce | api | ✅ 已完成 |
| X5 | tRPC logging middleware（用上 `ctx.log`） | api | ✅ 已完成 |
| X6 | 集成测试起步（Trophy 中间层） | server + api | ✅ 框架保留；临时 Phase 2 验收通过后已删除测试 |
| X7 | 成功响应 `X-Request-Id` | server | ✅ 已完成 |

### Later（按需）

| ID | 项 |
|----|-----|
| L1 | shutdown 幂等 + 关 DB + unhandledRejection（✅ 已完成） |
| L2 | `NODE_ENV` / `LOG_LEVEL` 枚举（t3-env + Zod，✅ 已完成） |
| L3 | CORS 多 origin / credentials 文档与实现 |
| L4 | CORP 按 API 场景调整 |
| L5 | `createApp` 注入 `db`（可测性，✅ 已完成） |
| L6 | pino-pretty 加载失败 fallback |
| L7 | procedure `.output()` DTO |
| L8 | patch schema 双轨合并 |
| L9 | README 生产启动专章 |
| L10 | drizzle `schema` 挂 client（RQB 需要时） |

### Won't（明确不做 / 不进模板）

| ID | 项 | 原因 |
|----|-----|------|
| W1 | 模板内置 auth | 你拍板：场景差太大 |
| W2 | REST 与 tRPC 双轨 CRUD | 契约唯一真相 |
| W3 | api 包读 env / 建 db 单例 | 边界 |
| W4 | 为 demo 上复杂 RBAC | 同上 |

---

## 探针约定（N2）

| Path | 语义 | 失败 |
|------|------|------|
| `GET /healthz` | 进程活着 | 几乎不应失败 |
| `GET /readyz` | 可接流量（至少 DB 可查询） | **503** |

编排示例：liveness → `/healthz`；readiness → `/readyz`。  
**不再提供 `/health`**，避免两套名字。

---

## 分页约定（N1）

实现：`packages/api/src/schemas/pagination.ts`

```ts
paginationInput.extend({ /* domain filters */ }).prefault({})
// → input 可省略；输出 { ...filters, page, pageSize }
// paginatedOutput(itemSchema) 校验 { items, page, pageSize, total, pageCount }
```

- `page` 默认 1；`pageSize` 默认 20、最大 100（写在 `paginationInput` 里，不 export 常量）
- service：`Promise.all([select limit/offset, db.$count])`，直接返回分页结果

---

## 建议你怎么用本文档

1. 只看 **Now / Next** 两表；Later 当停车场。  
2. 每做完一项，把状态改成 ✅ 或删行。  
3. Next 清空后：把「约定」并进 `apps/server/AGENTS.md` / `packages/api/AGENTS.md`，**删掉本 TEMP 文件**。

---

## 相关路径

- Host：`apps/server`
- Contract：`packages/api`
- Data：`packages/db`
