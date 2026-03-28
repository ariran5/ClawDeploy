FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .
RUN pnpm --filter @clawdeploy/shared build
RUN pnpm --filter @clawdeploy/api build
RUN pnpm --filter @clawdeploy/api deploy --prod /prod/api

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
COPY --from=builder --chown=appuser:appgroup /prod/api ./
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
