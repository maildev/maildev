# syntax=docker/dockerfile:1

# ── Base ─────────────────────────────────────────────────────────────────────
# corepack activates the exact pnpm version pinned in package.json's
# `packageManager` field — but only once package.json is present in the workdir,
# so the first pnpm invocation happens after it's copied (in the deps stage).
FROM node:22-alpine AS base
RUN apk add --no-cache tzdata
ENV TZ=UTC
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# ── Dependencies ─────────────────────────────────────────────────────────────
# Install the full workspace (incl. dev deps like turbo) with a frozen lockfile.
# Manifests + lockfile are copied before source so this layer is cached when only
# source changes. Uses pnpm's default in-image store (a real dir that persists
# into the build stage, which `pnpm deploy` needs to assemble /prod).
FROM base AS deps
WORKDIR /workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
# Build every package (tsc for core/smtp/api/mcp/cli, Vite for the UI), then
# `pnpm deploy` the CLI package + its @maildev/* workspace deps into an isolated,
# production-only tree at /prod (no dev deps, no source, no other packages).
FROM deps AS build
WORKDIR /workspace
RUN pnpm build
RUN pnpm --filter=maildev deploy --prod --legacy /prod

# ── Production ───────────────────────────────────────────────────────────────
FROM base AS prod
ENV NODE_ENV=production
USER node
WORKDIR /home/node/app
COPY --chown=node:node --from=build /prod ./

EXPOSE 1080 1025
ENV MAILDEV_WEB_PORT=1080
ENV MAILDEV_SMTP_PORT=1025

ENTRYPOINT ["node", "dist/bin/maildev.js"]

HEALTHCHECK --interval=10s --timeout=1s --start-period=5s --retries=3 \
  CMD if [ "$(cat /tmp/maildev-https 2>/dev/null)" = "true" ]; then \
    curl -k -f "https://localhost:${MAILDEV_WEB_PORT}${MAILDEV_BASE_PATHNAME}/api/healthz"; \
  else \
    curl -f "http://localhost:${MAILDEV_WEB_PORT}${MAILDEV_BASE_PATHNAME}/api/healthz"; \
  fi
