# syntax=docker/dockerfile:1
# Optimora platform API — production Docker image
# Build context: repo root
#
# Build:
#   docker build -f services/platform/Dockerfile -t optimora-platform:latest .
#
# Run:
#   docker run -p 3000:3000 \
#     -e DATABASE_URL=postgresql://... \
#     -e AUTH_SECRET=<32-char-secret> \
#     -e NODE_ENV=production \
#     optimora-platform:latest

# ── Stage 1: build ─────────────────────────────────────────────────────────────
# Single build stage: pnpm install runs here so symlinks are created locally
# (cross-stage COPY of pnpm virtual store breaks per-package symlinks).
FROM node:22-slim AS builder
WORKDIR /app

# openssl required by Prisma at generate time and at runtime
RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Copy workspace manifests first — layer cached until any package.json changes
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY services/platform/package.json    ./services/platform/

COPY packages/agent-contract/package.json ./packages/agent-contract/
COPY packages/auth-core/package.json      ./packages/auth-core/
COPY packages/config/package.json         ./packages/config/
COPY packages/db/package.json             ./packages/db/
COPY packages/events/package.json         ./packages/events/
COPY packages/org-graph/package.json      ./packages/org-graph/
COPY packages/ai/package.json             ./packages/ai/
COPY packages/extension-sdk/package.json  ./packages/extension-sdk/
COPY packages/plugin-sdk/package.json     ./packages/plugin-sdk/
COPY packages/sdk/package.json            ./packages/sdk/
COPY packages/ui/package.json             ./packages/ui/

COPY services/agency/package.json         ./services/agency/
COPY services/approval/package.json       ./services/approval/
COPY services/billing/package.json        ./services/billing/
COPY services/cognition/package.json      ./services/cognition/
COPY services/communication/package.json  ./services/communication/
COPY services/context/package.json        ./services/context/
COPY services/execution/package.json      ./services/execution/
COPY services/governance/package.json     ./services/governance/
COPY services/integrations/package.json   ./services/integrations/
COPY services/jurisdiction/package.json   ./services/jurisdiction/
COPY services/knowledge/package.json      ./services/knowledge/
COPY services/marketplace/package.json    ./services/marketplace/
COPY services/memory/package.json         ./services/memory/
COPY services/metering/package.json       ./services/metering/
COPY services/model-router/package.json   ./services/model-router/
COPY services/observability/package.json  ./services/observability/
COPY services/runtime/package.json        ./services/runtime/
COPY services/tools/package.json          ./services/tools/

# Install all deps (including devDependencies: prisma, tsc, etc.)
# Running install here — NOT copying from a deps stage — so pnpm creates
# per-package node_modules symlinks locally where they resolve correctly.
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Refresh package-local pnpm links after the source overlay so package CLIs
# such as prisma resolve from the final builder filesystem.
RUN pnpm --filter @optimora/platform... install --frozen-lockfile

# Build packages in dependency order.
# @optimora/config has no build script — omitted intentionally.
# prisma generate runs as part of @optimora/db build script.
RUN pnpm --filter @optimora/events         run build
RUN pnpm --filter @optimora/db             run build
RUN pnpm --filter @optimora/auth-core      run build
RUN pnpm --filter @optimora/agent-contract run build
RUN pnpm --filter @optimora/org-graph      run build
RUN pnpm --filter @optimora/ai             run build
RUN pnpm --filter @optimora/metering       run build
RUN pnpm --filter @optimora/billing        run build
RUN pnpm --filter @optimora/approval       run build
RUN pnpm --filter @optimora/jurisdiction   run build
RUN pnpm --filter @optimora/memory         run build
RUN pnpm --filter @optimora/agency         run build
RUN pnpm --filter @optimora/execution      run build
RUN pnpm --filter @optimora/runtime        run build
RUN pnpm --filter @optimora/platform       run build

# ── Stage 2: production runner ────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 platform \
  && adduser --system --uid 1001 platform

# Hoisted node_modules (runtime deps only — devDeps not needed at runtime)
COPY --from=builder --chown=platform:platform /app/node_modules              ./node_modules
COPY --from=builder --chown=platform:platform /app/services/platform/node_modules ./services/platform/node_modules

# Platform compiled output
COPY --from=builder --chown=platform:platform /app/services/platform/dist    ./services/platform/dist
COPY --from=builder --chown=platform:platform /app/services/platform/package.json ./services/platform/

# All packages (dist + package.json files for workspace module resolution)
COPY --from=builder --chown=platform:platform /app/packages                  ./packages

# Service compiled outputs needed at runtime
COPY --from=builder --chown=platform:platform /app/services/agency/package.json ./services/agency/
COPY --from=builder --chown=platform:platform /app/services/agency/node_modules ./services/agency/node_modules
COPY --from=builder --chown=platform:platform /app/services/approval/package.json ./services/approval/
COPY --from=builder --chown=platform:platform /app/services/approval/node_modules ./services/approval/node_modules
COPY --from=builder --chown=platform:platform /app/services/billing/package.json ./services/billing/
COPY --from=builder --chown=platform:platform /app/services/billing/node_modules ./services/billing/node_modules
COPY --from=builder --chown=platform:platform /app/services/execution/package.json ./services/execution/
COPY --from=builder --chown=platform:platform /app/services/execution/node_modules ./services/execution/node_modules
COPY --from=builder --chown=platform:platform /app/services/jurisdiction/package.json ./services/jurisdiction/
COPY --from=builder --chown=platform:platform /app/services/jurisdiction/node_modules ./services/jurisdiction/node_modules
COPY --from=builder --chown=platform:platform /app/services/memory/package.json ./services/memory/
COPY --from=builder --chown=platform:platform /app/services/memory/node_modules ./services/memory/node_modules
COPY --from=builder --chown=platform:platform /app/services/metering/package.json ./services/metering/
COPY --from=builder --chown=platform:platform /app/services/metering/node_modules ./services/metering/node_modules
COPY --from=builder --chown=platform:platform /app/services/runtime/package.json ./services/runtime/
COPY --from=builder --chown=platform:platform /app/services/runtime/node_modules ./services/runtime/node_modules
COPY --from=builder --chown=platform:platform /app/services/execution/dist   ./services/execution/dist
COPY --from=builder --chown=platform:platform /app/services/runtime/dist     ./services/runtime/dist
COPY --from=builder --chown=platform:platform /app/services/agency/dist      ./services/agency/dist
COPY --from=builder --chown=platform:platform /app/services/approval/dist    ./services/approval/dist
COPY --from=builder --chown=platform:platform /app/services/billing/dist     ./services/billing/dist
COPY --from=builder --chown=platform:platform /app/services/jurisdiction/dist ./services/jurisdiction/dist
COPY --from=builder --chown=platform:platform /app/services/memory/dist      ./services/memory/dist
COPY --from=builder --chown=platform:platform /app/services/metering/dist    ./services/metering/dist

USER platform

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "services/platform/dist/index.js"]
