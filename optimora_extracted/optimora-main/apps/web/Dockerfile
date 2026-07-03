# syntax=docker/dockerfile:1
# Optimora web app — production Docker image (T-30.1)
# Multi-stage: deps → builder → runner
# Output: standalone Next.js server (~150 MB with Node 22 slim)
#
# Build:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_TENANT_ID=<uuid> \
#     -t optimora-web:latest .
#
# Run:
#   docker run -p 3001:3001 \
#     -e PLATFORM_API_URL=https://api.optimora.ai \
#     -e NEXT_PUBLIC_TENANT_ID=<uuid> \
#     optimora-web:latest

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy workspace manifests (monorepo root + web app + required packages)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/agent-contract/package.json ./packages/agent-contract/
COPY packages/config/package.json ./packages/config/

# Install only production + build deps (frozen lockfile)
RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules 2>/dev/null || true

# Copy full source (needed for monorepo package resolution)
COPY . .

# Build shared packages first
RUN pnpm --filter @optimora/config build --if-present
RUN pnpm --filter @optimora/agent-contract build
RUN pnpm --filter @optimora/sdk build

# Build args for NEXT_PUBLIC_ vars (must be baked at build time)
ARG NEXT_PUBLIC_TENANT_ID=""
ENV NEXT_PUBLIC_TENANT_ID=$NEXT_PUBLIC_TENANT_ID

# Build Next.js in standalone mode
ENV NEXT_OUTPUT=standalone
RUN pnpm --filter @optimora/web build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public 2>/dev/null || true

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Standalone server entry point
CMD ["node", "apps/web/server.js"]
