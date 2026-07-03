# PROJECT_STATUS

## Latest completed tasks

| Task | Description | Commit |
|------|-------------|--------|
| T-20.1 | Frontend Dashboard / Agency Portal Foundation | bundled |
| T-21.1 | Dashboard API Integration / Real Data Wiring | bundled |
| T-22.1 | Frontend Auth + Tenant/Org Session Wiring | bundled |
| T-23.1 | Agency Onboarding + Workspace Setup Flow (7-step wizard) | `906adb2` |
| T-24.1 | End-to-End Demo Workflow / First Agent Run Flow | `d4faf7f` |
| T-25.1 | MVP Demo Polish + Seed Data / Demo Workspace | `f26aa4b` |
| T-26.1 | UI Design System Consistency + Industry Pack Icon System | `e1bb110` |
| T-27.1 | Buyer-Facing Landing Page / Website Homepage | `df15f6f` |
| T-28.1 | Production Readiness / Deployment Prep | `6584aa1` |
| T-29.1 | Staging Deployment + Smoke Test Prep | `22341b4` |
| T-30.1 | Deployment Artifacts + Standalone/Docker Packaging | `ccd2afd` |
| T-31.1 | Staging Deployment Runbook + Live Smoke Verification Prep | **latest** |

## Working tree
- Branch: `main`
- Last commit: T-28.1 (see above)
- Status: clean

## What was built in T-31.1
- `docs/STAGING_RUNBOOK.md` — exact deploy steps for each service tier (frontend-only / full-stack / production); service tier matrix; Vercel + Docker + Fly.io commands; Neon/Upstash/Temporal Cloud setup; env checklist (var names only, no values); post-deploy verification (env check → migrations → seed → health → smoke); rollback checklist; buyer demo checklist; troubleshooting (auth, CORS, DATABASE_URL, platform unreachable, smoke failures, optional services)
- `PROJECT_STATUS.md` — this file

## What was built in T-30.1
- `apps/web/Dockerfile` — 3-stage (deps → builder → runner); standalone Next.js output via `NEXT_OUTPUT=standalone`; non-root `nextjs` user; healthcheck on `/`
- `apps/web/next.config.ts` — `output: "standalone"` when `NEXT_OUTPUT=standalone` env set; no-op on Vercel (var never set)
- `services/platform/Dockerfile` — 3-stage; builds all workspace packages in dep order; non-root `platform` user; openssl for Prisma; healthcheck on `/health`
- `.dockerignore` — excludes node_modules, dist, .next, .env files, test files, editor artifacts from build context
- `infra/docker/docker-compose.staging.example.yml` — staging compose with platform + web; all secrets via env vars, no hardcoded values; healthcheck-aware `depends_on`
- `docs/DEPLOYMENT.md` — §11 Docker packaging: build commands, run commands, standalone output, migrations, seed, smoke test, compose usage
- `scripts/smoke-demo.mjs` — platform health check now skips gracefully on both ECONNREFUSED and 404
- `PROJECT_STATUS.md` — this file

## What was built in T-29.1
- `scripts/smoke-demo.mjs` — 13-check HTTP smoke test: landing page copy, hero headline, onboarding, login, dashboard auth gate, run-agent page, industry packs, Finance/CA jurisdictions (IN/CA/GB/Global), demo API proxy (405), platform health (graceful skip)
- `.env.staging.example` — staging env template with all 20 vars, safe placeholder values, comments on recommended providers; never commit with real secrets
- `docs/DEPLOYMENT.md` — staging deployment checklist, deployment target recommendations table, application smoke test section (§10)
- `package.json` — added `smoke:demo` script
- `PROJECT_STATUS.md` — this file

## What was built in T-28.1
- `scripts/check-env.ts` — env validator script; checks all 20 env vars across web/platform/db/redis/temporal/qdrant/clickhouse; detects insecure defaults; exits 1 on missing required vars; never prints secret values
- `docs/DEPLOYMENT.md` — full deployment guide: env var reference, local demo quick start, full-stack quick start, prod build verification, health checks, buyer demo checklist, safety checklist, common issues
- `package.json` — added `check:env` script
- `PROJECT_STATUS.md` — this file

## Demo-readiness summary

### What works without any live backend (dev/demo mode)
- Landing page (`/`) — fully static, no backend needed
- Onboarding wizard (`/onboarding`) — 7 steps, dev-mode stubs
- Dashboard (`/dashboard`) — all pages render with mock data
- Run Agent (`/dashboard/run`) — 4 examples, echo model, instant results
- Finance/CA jurisdiction flow — picker, disclaimer, echo output
- Industry pack icons — 12 packs, all from centralized registry
- Seed script dry-run — `pnpm seed:demo` (no `PLATFORM_API_URL`)

### What requires a live backend
- Real task creation and agent execution (needs Postgres + Platform API)
- Real audit trail persistence
- Magic-link auth
- Temporal workflows

## Key architecture invariants

- Finance/CA agent ALWAYS requires explicit jurisdiction — never defaults to one country. GLOBAL → safe fallback + disclaimer.
- All demo/echo runs: `modelProvider: "echo"` — zero paid AI calls.
- No real secrets, no real customer data, all emails are `.local`.
- Access tokens: httpOnly cookie only — never exposed to client JS.
- Dev/mock fallback: active when `PLATFORM_API_URL` / `NEXT_PUBLIC_API_KEY` unset.
- Auth secret default is intentionally conspicuous — `check:env` flags it.

## Resume rules (low-token mode)
- Read only files needed for the active task.
- Prefer existing exports/types.
- No paid AI calls unless EMS explicitly requires it.
- No ACR unless frozen architecture cannot support the task.
- Preserve: tenant isolation, RLS, audit/outbox events, fail-closed, green gates.

## Targeted test commands
```bash
# Frontend
pnpm --filter @optimora/web test
pnpm --filter @optimora/web typecheck
pnpm --filter @optimora/web lint
cd apps/web && pnpm build

# Platform
pnpm --filter @optimora/platform test
pnpm --filter @optimora/platform typecheck

# Env check (no backend needed)
pnpm check:env --profile demo

# Smoke test (requires web app running on :3001)
pnpm smoke:demo

# Seed dry-run (no backend needed)
pnpm seed:demo

# Full suite (unit tests, no infra)
pnpm test

# Infra health (requires Docker)
pnpm infra:up && pnpm infra:smoke
```

## Next EMS task
Confirm exact task ID/scope with EMS before implementing. Do NOT pick by guess.
