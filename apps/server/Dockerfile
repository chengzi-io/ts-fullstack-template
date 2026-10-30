# syntax=docker/dockerfile:1
#
# Production image for apps/server. The build context is the repository root:
#
#   docker build -f apps/server/Dockerfile -t ts-fullstack-server .
#
# Migrations never run at container start (docs/DECISIONS.md #5). The
# `migrate` target is a one-off job to run before starting a new version:
#
#   docker build -f apps/server/Dockerfile --target migrate -t ts-fullstack-migrate .
#   docker run --rm -e DATABASE_URL=… ts-fullstack-migrate            # pnpm db:migrate
#   docker run --rm -e DATABASE_URL=… ts-fullstack-migrate pnpm db:push  # demo, no migrations

# Major version from .nvmrc. Debian slim, not Alpine: @libsql/client ships
# glibc native binaries.
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV COREPACK_HOME=/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TURBO_TELEMETRY_DISABLED=1
WORKDIR /app
# pnpm version comes from `packageManager` in package.json.
COPY package.json ./
RUN corepack enable && corepack install

FROM base AS build
# Download every locked package once; only a lockfile change re-runs this.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile --store-dir /pnpm/store
COPY . .
# --ignore-scripts: the root `prepare` installs git hooks, and there is no .git.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --ignore-scripts --store-dir /pnpm/store
RUN pnpm turbo run build --filter=server
# Production node_modules for the server only, resolved from the shared
# lockfile. pnpm 10 deploys that way only with inject-workspace-packages,
# set here for this command so local workspace links stay symlinks.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter server deploy --prod --offline --ignore-scripts \
      --config.inject-workspace-packages=true \
      --store-dir /pnpm/store /prod/server

# One-off migration job: drizzle-kit, drizzle.config.ts, the module schemas,
# and packages/db/drizzle need the workspace sources and dev dependencies.
FROM build AS migrate
ENV NODE_ENV=production
WORKDIR /app/packages/db
USER node
CMD ["pnpm", "db:migrate"]

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
# Root-owned and read-only for the `node` user that runs the server.
COPY --from=build /prod/server/package.json ./package.json
COPY --from=build /prod/server/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./dist
USER node
EXPOSE 3000
# Liveness only (/healthz); orchestrators should gate traffic on /readyz.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/healthz`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/index.js"]
