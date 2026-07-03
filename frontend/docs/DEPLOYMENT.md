# Optimora — Deployment & Demo Guide

> **Status:** MVP demo-ready. Backend services require a live Postgres instance for full operation. All UI flows work in dev/demo mode without any live backend.

---

## 1. Environment variables

### Validate all env vars

```bash
pnpm check:env                    # all vars
pnpm check:env --profile web      # web app only
pnpm check:env --profile platform # platform API only
pnpm check:env --profile demo     # demo/seed only
```

### Web app (`apps/web/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `PLATFORM_API_URL` | No | Platform API base URL. When unset → dev/demo mode with mock data. |
| `NEXT_PUBLIC_API_KEY` | No | Public SDK key (`opt_…`). When unset → mock data. |
| `NEXT_PUBLIC_TENANT_ID` | No | Default tenant UUID for dev mode. |

**Dev mode:** omit all three → full UI works with deterministic mock data. No backend needed.

### Platform API (`services/platform/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | Postgres connection URL (`postgresql://…`) |
| `DIRECT_DATABASE_URL` | No | Direct URL for migrations (required with PgBouncer) |
| `AUTH_SECRET` | **Yes** | 32+ char random secret for JWT signing. **Change from default.** |
| `BASE_DOMAINS` | No | Comma-separated allowed domains for tenant resolution |
| `NODE_ENV` | No | Set to `production` to enable secure cookies |
| `PORT` | No | Listen port (default: 3000) |
| `REDIS_URL` | No | Redis URL for rate-limiting / caching |
| `TEMPORAL_ADDRESS` | No | Temporal address (default: `localhost:7233`) |
| `TEMPORAL_NAMESPACE` | No | Temporal namespace (default: `default`) |
| `TEMPORAL_TASK_QUEUE_BASE` | No | Task queue base name (default: `optimora`) |
| `QDRANT_URL` | No | Qdrant URL for vector memory (default: `http://localhost:6333`) |
| `QDRANT_API_KEY` | No | Qdrant API key (required in Qdrant Cloud) |
| `CLICKHOUSE_URL` | No | ClickHouse HTTP endpoint (default: `http://localhost:8123`) |
| `CLICKHOUSE_USER` | No | ClickHouse user (default: `optimora`) |
| `CLICKHOUSE_PASSWORD` | No | ClickHouse password |
| `CLICKHOUSE_DATABASE` | No | ClickHouse database (default: `optimora_olap`) |

---

## 2. Quick start — local demo (no live backend)

This runs the full UI demo with deterministic mock data. No database, no Temporal, no paid AI calls.

```bash
# 1. Install dependencies
pnpm install

# 2. Validate env (demo profile — all optional in dev)
pnpm check:env --profile demo

# 3. Build shared packages
pnpm --filter @optimora/sdk build
pnpm --filter @optimora/agent-contract build

# 4. Start web app
cd apps/web && pnpm dev
# → http://localhost:3001

# 5. Open the landing page
open http://localhost:3001

# 6. Run the seed script (dry-run — no backend needed)
pnpm seed:demo
```

**Demo flow:**
1. `http://localhost:3001` — landing page
2. Click **Start building for free** → `/onboarding` (7-step wizard)
3. Complete onboarding → `/dashboard`
4. Sidebar → **Run Agent** → pick an example → **Assign to agent**
5. See output, tokens, run/task IDs

---

## 3. Quick start — full stack (with live backend)

```bash
# 1. Start infrastructure
pnpm infra:up
# Starts: Postgres :5433, Redis :6379, Temporal :7233/:8080,
#         Qdrant :6333, ClickHouse :8123/:9000

# 2. Wait for services
pnpm infra:smoke
# Checks all TCP ports are reachable

# 3. Run database migrations
pnpm --filter @optimora/db exec prisma migrate deploy

# 4. Generate Prisma client
pnpm --filter @optimora/db exec prisma generate

# 5. Validate env
DATABASE_URL="postgresql://optimora:optimora@localhost:5433/optimora_dev" \
AUTH_SECRET="your-32-char-secret-here-change-me!!" \
pnpm check:env --profile platform

# 6. Start platform API
cd services/platform && pnpm dev
# → http://localhost:3000

# 7. Seed demo data
PLATFORM_API_URL=http://localhost:3000 \
DEMO_API_KEY=opt_your_key_here \
pnpm seed:demo

# 8. Start web app
PLATFORM_API_URL=http://localhost:3000 \
NEXT_PUBLIC_TENANT_ID=00000000-demo-0000-0000-000000000001 \
cd apps/web && pnpm dev
# → http://localhost:3001

# 9. Run first demo agent
open http://localhost:3001/dashboard/run
```

---

## 4. Production build verification

```bash
# All packages
pnpm build

# Web app only
pnpm --filter @optimora/web build

# Platform typecheck
pnpm --filter @optimora/platform typecheck

# All tests (unit — no infra needed)
pnpm test
```

Expected build output:
- `/` (landing) — static, ~170 B
- `/onboarding` — static, ~7 kB  
- `/dashboard/run` — static, ~6.3 kB
- `/login` — dynamic (auth)
- All API routes — dynamic

---

## 5. Health checks

### Infrastructure (TCP reachability)

```bash
pnpm infra:smoke
# Checks: Postgres, Redis, Temporal, Qdrant, ClickHouse
```

### Platform API

```bash
# Basic health
curl http://localhost:3000/healthz

# With auth (replace token)
curl -H "Authorization: Bearer <token>" http://localhost:3000/v1/public/agents
```

### Web app

```bash
curl -I http://localhost:3001
# Expect: HTTP/1.1 200 OK
```

---

## 6. Buyer demo checklist

Work through this before any client-facing demo.

### Landing page
- [ ] `http://localhost:3001` loads cleanly
- [ ] Hero headline visible: "Your AI workforce, ready to work"
- [ ] Stats strip shows 4 metrics
- [ ] Industry pack grid shows 12 packs with consistent icons
- [ ] Finance / CA section shows IN / CA / US / GB / Global
- [ ] "Start building for free" CTA → `/onboarding`
- [ ] "Run your first agent" CTA → `/dashboard/run`

### Onboarding
- [ ] `/onboarding` loads with 7-step progress indicator
- [ ] Step 1: agency name + support email
- [ ] Step 2: brand name + accent color + white-label toggle
- [ ] Step 3: client workspace name + industry icon grid
- [ ] Step 4: jurisdiction selector (IN / US / CA / GB / AU / GLOBAL)
- [ ] Step 5: module cards — Finance/CA shows "jurisdiction-aware" badge
- [ ] Step 6: plan selector (no payment collected)
- [ ] Step 7: review summary

### Dashboard
- [ ] `/dashboard` loads with overview stats
- [ ] Sidebar shows all modules including "Run Agent" (⚡)
- [ ] Agents, Tasks, Runs pages load with demo data
- [ ] No "undefined" or raw error messages visible

### Run Agent (core demo)
- [ ] `/dashboard/run` loads with 4 example chips
- [ ] Agent selector shows 4 cards with icons (Sales/Support/Finance/Research)
- [ ] Click "Sales — lead follow-up" → pre-fills form
- [ ] Click "Assign to agent" → result view appears
- [ ] Result shows: output fields, run ID, token counts, model: echo
- [ ] "Demo mode" amber banner visible (dev mode only)
- [ ] "Run another task" resets form

### Finance / CA jurisdiction flow
- [ ] Select Finance / CA agent → jurisdiction picker appears
- [ ] Amber banner: "Jurisdiction required — never defaults to one country"
- [ ] Click "Finance/CA — jurisdiction-aware" example → selects CA jurisdiction
- [ ] Output includes `jurisdiction` and `disclaimer` fields
- [ ] Output shows CRA/GST reference + CPA disclaimer copy

### Industry packs (onboarding step 3 / landing)
- [ ] All 12 industry pack cards render with Lucide icons
- [ ] No emoji in any pack label
- [ ] All icons use same size container (h-10 w-10 rounded-xl)
- [ ] Colors are restrained — no overwhelming orange/purple blocks

---

## 7. Safety checklist (pre-demo)

Run before any external-facing demo or recording:

### No secrets in frontend bundle
```bash
# Build web app
pnpm --filter @optimora/web build

# Check .next/static for any opt_ keys or Bearer tokens
grep -r "opt_" apps/web/.next/static/ 2>/dev/null || echo "✓ No SDK keys in bundle"
grep -r "Bearer" apps/web/.next/static/ 2>/dev/null || echo "✓ No Bearer tokens in bundle"
```

### No paid AI calls
- [ ] `modelProvider` in all demo runs shows `echo` — not `claude`, `gpt-4`, or `gemini`
- [ ] `DEMO_API_KEY` is not set in the web app env (seed only)
- [ ] Platform API has no `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` set

### No real integrations
- [ ] No Stripe webhook secrets set
- [ ] No Slack / Gmail / CRM credentials set
- [ ] No real customer data in DEMO_* workspace

### Demo data only
- [ ] `pnpm seed:demo` output shows `DRY RUN` if no `PLATFORM_API_URL`
- [ ] All demo emails end in `.local` domain
- [ ] All demo IDs contain `demo` in the string

---

## 8. Stopping services

```bash
# Stop infra
pnpm infra:down

# Stop infra and wipe data volumes (full reset)
pnpm infra:reset
```

---

## 9. Staging deployment checklist

### Pre-deploy

- [ ] `pnpm check:env --profile platform` — zero missing required vars
- [ ] `AUTH_SECRET` is 32+ chars and NOT the insecure default
- [ ] `DATABASE_URL` points to staging Postgres (not local)
- [ ] `NODE_ENV=production` set in platform env
- [ ] `.env.staging.example` copied to actual env vars in hosting provider — no plain-text secrets committed
- [ ] `pnpm build` passes locally with `PLATFORM_API_URL` set to staging URL
- [ ] No `DEMO_API_KEY` set in web app environment (seed-only var)
- [ ] No `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or Stripe keys set (not needed for demo)

### Database

- [ ] Run `prisma migrate deploy` against staging DB
- [ ] Run `prisma generate` if client not pre-built
- [ ] Confirm RLS policies applied (check `_rls` migrations ran)
- [ ] Run `pnpm seed:demo` with staging `PLATFORM_API_URL` + `DEMO_API_KEY`

### Deploy order

1. Postgres (must be up and migrated before platform starts)
2. Redis, Temporal, Qdrant, ClickHouse (optional — platform degrades gracefully)
3. Platform API service
4. Web app (set `PLATFORM_API_URL` to platform URL)

### Post-deploy smoke test

```bash
# Against staging
WEB_URL=https://staging.optimora.ai pnpm smoke:demo

# Against local dev server
pnpm smoke:demo   # defaults to localhost:3001 / localhost:3000
```

### Deployment target recommendations

| Service | Recommended options |
|---|---|
| **Web app** | Vercel (easiest, static+edge), Fly.io, Railway, Render |
| **Platform API** | Fly.io (good for stateful long-running), Railway, Render, AWS App Runner |
| **PostgreSQL** | Neon (serverless, free tier), Supabase, Railway Postgres, Fly Postgres |
| **Redis** | Upstash (serverless, free tier), Railway Redis, Fly Redis |
| **Temporal** | Temporal Cloud (managed, free tier), self-hosted on Fly/k8s |
| **Qdrant** | Qdrant Cloud (free tier), self-hosted on Fly/Railway |
| **ClickHouse** | ClickHouse Cloud (free tier), self-hosted (requires more RAM — skip for initial staging) |

**Minimum viable staging stack** (for buyer demo):
- Web app + Platform API + Postgres. Everything else optional — demo route is synchronous and doesn't need Temporal.

---

## 10. Application smoke test

Tests the demo application layer — landing page copy, routes, API endpoints.

```bash
# Local (start web app first)
pnpm smoke:demo

# Staging
WEB_URL=https://staging.optimora.ai pnpm smoke:demo

# With platform
WEB_URL=https://staging.optimora.ai PLATFORM_URL=https://api-staging.optimora.ai pnpm smoke:demo
```

Checks (12 total):
1. Landing page loads + contains "Optimora"
2. Hero copy contains "AI workforce"
3. Onboarding page loads
4. Login page loads
5. Dashboard route responds (3xx auth redirect is OK)
6. Run Agent page responds
7. Industry packs copy present
8. Finance/CA — India jurisdiction present
9. Finance/CA — Canada jurisdiction present
10. Finance/CA — Global fallback present
11. Finance/CA — "jurisdiction" copy present
12. Demo run API proxy route exists (405 on GET = route registered)
13. Platform API health (skipped gracefully if not running)

---

## 11. Docker packaging (T-30.1)

### Build images (from repo root)

```bash
# Web app (standalone Next.js server)
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_TENANT_ID=<uuid> \
  -t optimora-web:latest .

# Platform API
docker build -f services/platform/Dockerfile \
  -t optimora-platform:latest .
```

### Run containers

```bash
# Platform API (needs DATABASE_URL + AUTH_SECRET at minimum)
docker run -d --name optimora-platform \
  -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e AUTH_SECRET="$AUTH_SECRET" \
  -e NODE_ENV=production \
  optimora-platform:latest

# Web app
docker run -d --name optimora-web \
  -p 3001:3001 \
  -e PLATFORM_API_URL=http://optimora-platform:3000 \
  -e NEXT_PUBLIC_TENANT_ID="$NEXT_PUBLIC_TENANT_ID" \
  -e NODE_ENV=production \
  optimora-web:latest
```

### Standalone Next.js output

`output: "standalone"` is enabled via `NEXT_OUTPUT=standalone` env var at build time (set in Dockerfile). On Vercel this var is never set, so Vercel continues to use its own output format. For Docker/Fly/Railway builds the Dockerfile sets it.

To test standalone output locally:

```bash
cd apps/web
NEXT_OUTPUT=standalone pnpm build
PORT=3001 node .next/standalone/apps/web/server.js
```

### Database migrations

```bash
# Run against any DATABASE_URL
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  optimora-platform:latest \
  node -e "import('@optimora/db').then(m => m.runMigrations())" \
  # OR: use prisma CLI from host
```

From host (preferred for migrations):
```bash
cd packages/db
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
```

### Seed demo data

```bash
# Dry-run (no backend)
pnpm seed:demo

# Against staging platform
PLATFORM_API_URL=https://api-staging.optimora.ai \
DEMO_API_KEY=opt_... \
pnpm seed:demo
```

### Run smoke test after Docker deploy

```bash
WEB_URL=https://staging.optimora.ai pnpm smoke:demo
```

### Staging compose example

See `infra/docker/docker-compose.staging.example.yml` — copy it to `docker-compose.staging.yml` (gitignored), fill in env vars, then:

```bash
docker compose -f infra/docker/docker-compose.staging.example.yml up -d
```

---

## 12. Common issues

| Issue | Fix |
|---|---|
| `pnpm: command not found` | `corepack enable && corepack prepare pnpm@9.15.0 --activate` |
| Platform API crashes on start | Check `DATABASE_URL` is set and Postgres is running |
| Web shows "upstream_error" | Check `PLATFORM_API_URL` points to a running platform instance |
| Prisma: "environment variable not found" | Export `DATABASE_URL` before running migrate |
| `AUTH_SECRET` warning in `check:env` | Set a real 32+ char random secret: `openssl rand -base64 32` |
| Temporal connection refused | Run `pnpm infra:up` and wait 10s for Temporal to be ready |
| Build error: tailwindcss version | Ensure `tailwindcss@3.4.19` — v4 not yet published at `^3.x` |
