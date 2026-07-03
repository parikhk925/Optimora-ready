# Staging Deployment Dry Run

Last prepared: 2026-06-30  
Branch: `main`  
Purpose: prepare an actual staging deployment dry-run after the Automation OS foundation merge.

This guide is operational. It contains commands, provider settings, smoke routes, expected success signals, rollback steps, and manual checks. It must not contain secret values, `.env` file contents, Supabase URL values, Render variable values, or production credentials.

## Scope Rules

- Work from latest `main`.
- Do not merge `save/local-command-center`.
- Do not add product features.
- Do not redesign UI.
- Do not change `.env`, `.env.local`, `.env.production`, secret files, Supabase URL values, Render variables, or production credentials.
- Commit docs-only changes unless a deployment command is impossible because a script name is wrong.

## 1. Confirm Repo State

Run from the repository root:

```bash
git status
git pull origin main
git log --oneline -5
```

Expected:

- Current branch is `main`.
- Pull reports latest `origin/main` or fast-forwards cleanly.
- No unexpected product-code changes are present before the dry run.
- Latest log includes the staging checklist commit and Automation OS foundation merge.

## 2. Local Validation Gate

Run these exact commands from the repository root before deploying staging:

```bash
CI=true pnpm install
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm build
pnpm --filter @optimora/db run db:generate
pnpm --filter @optimora/db exec prisma validate
```

Expected success output:

- `CI=true pnpm install`: exits `0`; lockfile is accepted and dependencies install or report already up to date.
- `CI=true pnpm lint`: exits `0`; Turbo reports all lint tasks successful. Existing platform warnings are acceptable only if the command still exits `0`.
- `CI=true pnpm typecheck`: exits `0`; Turbo reports all typecheck tasks successful.
- `CI=true pnpm build`: exits `0`; Turbo reports all build tasks successful and the web build emits the expected route table.
- `pnpm --filter @optimora/db run db:generate`: exits `0`; Prisma reports that the client was generated.
- `pnpm --filter @optimora/db exec prisma validate`: exits `0`; Prisma reports that the schema is valid.

Do not proceed to staging if any command exits non-zero.

## 3. Verified Command Map

These commands were verified against the current package scripts and Dockerfile.

### Web App

Package: `@optimora/web`  
Path: `apps/web`

Build:

```bash
pnpm --filter @optimora/web run build
```

Start for self-hosted Next.js:

```bash
pnpm --filter @optimora/web run start
```

Local dev only:

```bash
pnpm --filter @optimora/web run dev
```

### Platform Service

Package: `@optimora/platform`  
Path: `services/platform`  
Dockerfile: `services/platform/Dockerfile`  
Build context: repository root

Docker build:

```bash
docker build -f services/platform/Dockerfile -t optimora-platform:staging .
```

Docker run health dry-run, using already exported environment variables:

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV \
  -e PORT \
  -e DATABASE_URL \
  -e DIRECT_DATABASE_URL \
  -e AUTH_SECRET \
  -e BASE_DOMAINS \
  optimora-platform:staging
```

Health checks from another terminal:

```bash
curl -f http://localhost:3000/healthz
curl -f http://localhost:3000/readyz
```

Expected:

- `/healthz` returns HTTP `200` with platform health JSON.
- `/readyz` returns HTTP `200` with readiness JSON.
- The container does not crash with `ERR_MODULE_NOT_FOUND`.
- A local database connection failure after startup is a deployment environment issue, not a module-resolution issue.

### Database

Package: `@optimora/db`  
Path: `packages/db`

Generate Prisma client:

```bash
pnpm --filter @optimora/db run db:generate
```

Validate schema:

```bash
pnpm --filter @optimora/db exec prisma validate
```

Apply staging migrations:

```bash
pnpm --filter @optimora/db run db:deploy
```

Equivalent raw Prisma command:

```bash
pnpm --filter @optimora/db exec prisma migrate deploy
```

Dev-only migration command:

```bash
pnpm --filter @optimora/db run db:migrate
```

Do not use `db:migrate`, `db:reset`, `prisma migrate reset`, or `prisma db push` against staging.

### Seeds

Automation OS catalog seed:

```bash
pnpm --filter @optimora/db tsx prisma/seed/automation-os.ts
```

Demo workspace seed:

```bash
pnpm seed:demo
```

Notes:

- The Automation OS catalog seed is a TSX file, not a package script.
- `pnpm seed:demo` is dry-run when the platform URL is not set.
- Live seed runs must target staging only.

## 4. Vercel Web Deployment Settings

Use these settings for the staging web project.

- Project source: GitHub repo `parikhk925/optimora`.
- Branch: `main`.
- Framework preset: `Next.js`.
- Root directory: `apps/web`.
- Install command:

```bash
cd ../.. && pnpm install --frozen-lockfile
```

- Build command:

```bash
cd ../.. && pnpm --filter @optimora/web run build
```

- Output directory:

```text
.next
```

- Do not set `NEXT_OUTPUT` for Vercel.
- Vercel does not use the web `start` script for managed Next.js hosting.
- If using Docker/self-hosting instead of Vercel, use the web Dockerfile path `apps/web/Dockerfile` from the repository root.

## 5. Platform Deployment Notes

### Render

- Runtime: Docker.
- Branch: `main`.
- Build context: repository root.
- Dockerfile path: `services/platform/Dockerfile`.
- Health check path: `/healthz`.
- Runtime port: use the `PORT` environment variable.
- Required environment variable names are listed below; set values only in Render.
- After deploy, verify `/healthz` and `/readyz`.

### Fly.io

- Build from the repository root.
- Use Dockerfile path `services/platform/Dockerfile`.
- Internal service port should match `PORT`.
- Set secrets with Fly secrets, not committed files.
- Verify with platform logs plus `/healthz`.

Example deploy command shape:

```bash
fly deploy --dockerfile services/platform/Dockerfile
```

### Railway

- Use Dockerfile deployment.
- Build context: repository root.
- Dockerfile path: `services/platform/Dockerfile`.
- Set the environment variable names below in Railway.
- Configure health check path `/healthz` if health checks are enabled.

## 6. Environment Variable Names

Names only. Do not put values in this file.

### Web Runtime

- `NODE_ENV`
- `PORT`
- `PLATFORM_API_URL`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_KEY`
- `NEXT_PUBLIC_TENANT_ID`
- `NEXT_PUBLIC_ORG_ID`
- `NEXT_PUBLIC_AGENCY_NAME`
- `NEXT_PUBLIC_PLAN_KEY`
- `NEXT_PUBLIC_WORKSPACE_NAME`
- `NEXT_PUBLIC_WORKSPACE_SLUG`

### Web Docker Build Only

- `NEXT_OUTPUT`

### Platform Runtime

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `AUTH_SECRET`
- `BASE_DOMAINS`
- `REDIS_URL`
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `TEMPORAL_TASK_QUEUE_BASE`
- `TEMPORAL_LOG_LEVEL`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `CLICKHOUSE_URL`
- `CLICKHOUSE_USER`
- `CLICKHOUSE_PASSWORD`
- `CLICKHOUSE_DATABASE`

### Migration, Seed, And Smoke Commands

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `DEMO_API_KEY`
- `DEMO_TENANT_ID`
- `DEMO_ORG_ID`
- `PLATFORM_API_URL`
- `WEB_URL`
- `PLATFORM_URL`

## 7. Supabase Migration Steps

Run these after the local validation gate and before seeding.

1. Confirm the shell or CI job is pointing at staging database environment variable names.
2. Confirm `DIRECT_DATABASE_URL` is available for migrations when Supabase pooling is used.
3. Generate Prisma client:

```bash
pnpm --filter @optimora/db run db:generate
```

4. Validate Prisma schema:

```bash
pnpm --filter @optimora/db exec prisma validate
```

5. Apply migrations:

```bash
pnpm --filter @optimora/db run db:deploy
```

6. Confirm migration status:

```bash
pnpm --filter @optimora/db exec prisma migrate status
```

Expected:

- Prisma validates the schema.
- Migrate deploy applies pending migrations or reports no pending migrations.
- Migration history includes `20260630000000_automation_os` and `20260630060000_automation_os_foundation`.

Stop if migration status is failed, drifted, or points at the wrong database.

## 8. Seed And Demo Data Steps

Run after migrations.

1. Seed the Automation OS catalog:

```bash
pnpm --filter @optimora/db tsx prisma/seed/automation-os.ts
```

Expected:

- The command exits `0`.
- Output includes completion for integrations, agent definitions, workflow templates, and industry packs.

2. Optionally run demo workspace seed:

```bash
pnpm seed:demo
```

Expected:

- Without platform configuration, the command runs as dry-run and sends no requests.
- With staging platform configuration, the command sends requests only to staging.

Do not seed real customer data, production API keys, or production tenant/org IDs.

## 9. Smoke Test Route List

Run against the staging web URL after web and platform deploys.

- `/`
- `/ai-automation-os`
- `/white-label-agency`
- `/paid-pilot`
- `/solutions`
- `/onboarding`
- `/dashboard`
- `/dashboard/packs`
- `/dashboard/workflows`
- `/dashboard/activity`
- `/dashboard/roi`
- `/dashboard/agency-os`
- `/api/automation/packs`
- `/api/automation/workflows`
- `/api/automation/activity`
- `/api/automation/roi`

Run against the staging platform URL:

- `/healthz`
- `/readyz`

Run the existing smoke script when both URLs are available:

```bash
WEB_URL=$WEB_URL PLATFORM_URL=$PLATFORM_URL pnpm smoke:demo
```

Expected:

- Script exits `0`.
- Output reports all smoke checks passed.
- Platform health check either passes or is explicitly skipped only in frontend-only demo mode.

## 10. Manual Verification After Deployment

- [ ] Vercel deployment is on the expected `main` commit.
- [ ] Platform service deployment is on the expected `main` commit or image tag.
- [ ] Platform `/healthz` returns success.
- [ ] Platform `/readyz` returns success.
- [ ] Supabase migration status is clean.
- [ ] Automation OS catalog seed completed if DB-backed staging is expected.
- [ ] `/api/automation/packs` returns a successful response.
- [ ] `/api/automation/workflows` returns a successful response.
- [ ] `/api/automation/activity` returns a successful response.
- [ ] `/api/automation/roi` returns a successful response.
- [ ] Landing, sales, solutions, onboarding, and dashboard pages render without visible server errors.
- [ ] Dashboard auth redirects are expected and not mistaken for failed pages.
- [ ] Browser console has no new deployment-blocking errors.
- [ ] Demo mode is labeled as demo/fallback where relevant.
- [ ] No integration is described as live unless it is actually configured and smoke-tested.
- [ ] No secret values are visible in browser source, logs, docs, or committed files.

## 11. Rollback Steps

Web:

- Roll back Vercel to the previous successful deployment.
- Re-run web smoke routes.
- Re-run `pnpm smoke:demo` with staging URL names if available.

Platform:

- Roll back Render/Fly/Railway to the previous successful image or deployment.
- Verify `/healthz`.
- Verify `/readyz`.
- Check logs for module-resolution or database-connection errors.

Database:

- Do not manually edit staging schema as a rollback.
- If a migration failed before applying, fix the failed migration state before retrying.
- If a migration applied and must be reversed, create a forward corrective migration.
- If seed data is wrong, correct the seed source and rerun the idempotent seed.

After any rollback:

```bash
WEB_URL=$WEB_URL PLATFORM_URL=$PLATFORM_URL pnpm smoke:demo
```

## 12. Known Risks

- The current repo may have local uncommitted files; do not include them in docs-only deployment commits.
- Web Automation OS API routes can use fallback/demo data if database access is unavailable.
- Web DB-backed behavior requires server-side database access in the web deployment environment.
- Platform startup depends on correct `DATABASE_URL`, `DIRECT_DATABASE_URL`, and `AUTH_SECRET` values in staging.
- Supabase migration commands must point at staging only.
- Optional Redis, Temporal, Qdrant, and ClickHouse are not required for a buyer-demo stack, but production behavior depends on them.
- `db:migrate` and `db:reset` exist but are not staging-safe commands.
- Some older docs may describe prior demo routes; this dry-run guide and `docs/STAGING_DEPLOYMENT_CHECKLIST.md` are the current staging readiness references.
- Integration catalog records are not proof that external systems are connected.

## 13. Dry Run Sign-Off

- [ ] Repo is on latest `main`.
- [ ] Local validation gate passed.
- [ ] Provider settings are configured with names only in docs and real values only in providers.
- [ ] Supabase migrations applied.
- [ ] Seeds completed where required.
- [ ] Web deployed.
- [ ] Platform deployed.
- [ ] Smoke routes checked.
- [ ] Manual verification checklist completed.
- [ ] Rollback path confirmed.
- [ ] No secrets, `.env` files, Supabase URL values, Render variables, or production credentials were touched.
