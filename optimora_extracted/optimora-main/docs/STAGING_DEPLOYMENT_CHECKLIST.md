# Staging Deployment Checklist

Last readiness pass: 2026-06-30  
Branch: `main`  
Scope: Automation OS foundation readiness after merge.

This checklist is for staging only. It records required deployment steps, validation gates, smoke routes, and remaining integration risks. It must not contain secrets, production credentials, Supabase URL values, Render variable values, or private customer data.

## Pre-Deployment Gate

- [ ] Work from latest `main`.
- [ ] Confirm no unrelated branch is merged, especially `save/local-command-center`.
- [ ] Confirm the working tree is clean.
- [ ] Confirm no `.env`, `.env.local`, `.env.production`, secret files, Supabase URL values, Render variable values, or production credentials are changed.
- [ ] Run the full local validation set before promoting staging:

```bash
CI=true pnpm install
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm build
pnpm --filter @optimora/db run db:generate
pnpm --filter @optimora/db exec prisma validate
```

## Web Deployment Steps

The web app is `@optimora/web` in `apps/web`.

- [ ] Deploy from `main`.
- [ ] Use Node 22 or newer.
- [ ] Install with `pnpm install` from the repo root, or the hosting provider equivalent.
- [ ] Build command:

```bash
pnpm --filter @optimora/web run build
```

- [ ] Start command for a self-hosted Next.js runtime:

```bash
pnpm --filter @optimora/web run start
```

- [ ] For Docker/self-hosted standalone web deploys, build from the repo root:

```bash
docker build -f apps/web/Dockerfile -t optimora-web:staging .
```

- [ ] Do not set `NEXT_OUTPUT` on Vercel-style managed Next.js hosting.
- [ ] Only set `NEXT_OUTPUT=standalone` for Docker/self-hosted standalone output.
- [ ] If the web app should call the platform service, set the platform base URL in the web hosting environment.
- [ ] If the web app is intentionally a frontend-only staging demo, leave platform-dependent vars unset and verify demo/fallback behavior explicitly.

## Platform Service Deployment Steps

The platform service is `@optimora/platform` in `services/platform`.

- [ ] Deploy from `main`.
- [ ] Use `services/platform/Dockerfile` with repo root as the Docker build context.
- [ ] Platform Docker build command:

```bash
docker build -f services/platform/Dockerfile -t optimora-platform:staging .
```

- [ ] Platform runtime command is provided by the Dockerfile:

```bash
node services/platform/dist/index.js
```

- [ ] The platform image must include workspace runtime packages, not only compiled `dist` folders.
- [ ] The platform image must resolve runtime imports from `@optimora/db`, approval, billing, metering, memory, and related workspace services.
- [ ] Set the platform listen port in the hosting provider.
- [ ] Health check path:

```text
/healthz
```

- [ ] Readiness path:

```text
/readyz
```

- [ ] If the Dockerfile or workspace package graph changes, validate with both a Docker build and a local Docker run before deploying.

## Supabase Migration Steps

The database package is `@optimora/db` in `packages/db`.

- [ ] Point migration commands at the staging Supabase database only.
- [ ] Use a direct/non-pooled database connection for migrations when Supabase pooling is enabled.
- [ ] Confirm Prisma schema validity before applying migrations:

```bash
pnpm --filter @optimora/db exec prisma validate
```

- [ ] Generate the Prisma client:

```bash
pnpm --filter @optimora/db run db:generate
```

- [ ] Apply pending migrations to staging:

```bash
pnpm --filter @optimora/db exec prisma migrate deploy
```

- [ ] Confirm migrations include the Automation OS foundation migrations through `20260630060000_automation_os_foundation`.
- [ ] Do not run `prisma migrate reset`, `db push`, destructive SQL, or local reset commands against staging.
- [ ] If a migration fails, stop the deploy and inspect Prisma migration status before retrying.

## Seed And Demo Data Steps

Automation OS catalog data is seeded by `packages/db/prisma/seed/automation-os.ts`.

- [ ] Run migrations before seeding.
- [ ] Seed the Automation OS catalog only after schema validation succeeds:

```bash
pnpm --filter @optimora/db tsx prisma/seed/automation-os.ts
```

- [ ] The catalog seed is intended to be safe to rerun; it upserts definitions and recreates catalog joins.
- [ ] Run the older demo workspace seed only when a staging demo workspace is expected:

```bash
pnpm seed:demo
```

- [ ] `pnpm seed:demo` is dry-run when the platform URL is unset.
- [ ] Live seed runs must use staging tenant/org/API key values only.
- [ ] Do not seed real customer data.
- [ ] Do not seed production API keys or production tenant/org identifiers.

## Environment Variable Checklist

Names only. Values belong in the hosting provider, Supabase, Render, Vercel, CI, or the local shell used for staging operations. Do not commit values.

### Web Runtime

- [ ] `NODE_ENV`
- [ ] `PORT`
- [ ] `PLATFORM_API_URL`
- [ ] `NEXT_PUBLIC_API_BASE_URL`
- [ ] `NEXT_PUBLIC_API_KEY`
- [ ] `NEXT_PUBLIC_TENANT_ID`
- [ ] `NEXT_PUBLIC_ORG_ID`
- [ ] `NEXT_PUBLIC_AGENCY_NAME`
- [ ] `NEXT_PUBLIC_PLAN_KEY`
- [ ] `NEXT_PUBLIC_WORKSPACE_NAME`
- [ ] `NEXT_PUBLIC_WORKSPACE_SLUG`

### Web Docker Build Only

- [ ] `NEXT_OUTPUT`

### Platform Runtime

- [ ] `NODE_ENV`
- [ ] `PORT`
- [ ] `DATABASE_URL`
- [ ] `DIRECT_DATABASE_URL`
- [ ] `AUTH_SECRET`
- [ ] `BASE_DOMAINS`
- [ ] `REDIS_URL`
- [ ] `TEMPORAL_ADDRESS`
- [ ] `TEMPORAL_NAMESPACE`
- [ ] `TEMPORAL_TASK_QUEUE_BASE`
- [ ] `TEMPORAL_LOG_LEVEL`
- [ ] `QDRANT_URL`
- [ ] `QDRANT_API_KEY`
- [ ] `CLICKHOUSE_URL`
- [ ] `CLICKHOUSE_USER`
- [ ] `CLICKHOUSE_PASSWORD`
- [ ] `CLICKHOUSE_DATABASE`

### Seed And Smoke Commands

- [ ] `DEMO_API_KEY`
- [ ] `DEMO_TENANT_ID`
- [ ] `DEMO_ORG_ID`
- [ ] `WEB_URL`
- [ ] `PLATFORM_URL`

## Smoke Test Routes

Run route checks against the staging web host after web deployment. For dashboard routes, unauthenticated redirects are acceptable only if the auth gate is expected.

- [ ] `/`
- [ ] `/ai-automation-os`
- [ ] `/white-label-agency`
- [ ] `/paid-pilot`
- [ ] `/solutions`
- [ ] `/onboarding`
- [ ] `/dashboard`
- [ ] `/dashboard/packs`
- [ ] `/dashboard/workflows`
- [ ] `/dashboard/activity`
- [ ] `/dashboard/roi`
- [ ] `/dashboard/agency-os`
- [ ] `/api/automation/packs`
- [ ] `/api/automation/workflows`
- [ ] `/api/automation/activity`
- [ ] `/api/automation/roi`

Run the existing smoke script when staging URLs are available:

```bash
WEB_URL=<staging-web-url> PLATFORM_URL=<staging-platform-url> pnpm smoke:demo
```

Platform service smoke checks:

- [ ] `/healthz`
- [ ] `/readyz`

## Demo Mode Versus Real Mode

Demo mode:

- Uses static/fallback Automation OS data when database-backed reads are unavailable.
- Shows industry packs, workflow templates, activity, ROI, and dashboard pages for buyer-demo navigation.
- Can run dry-run seed output without sending live platform requests.
- Does not prove external integrations are connected.
- Must not claim live Gmail, WhatsApp, LinkedIn, CRM, billing, or workflow execution unless those integrations are actually configured and tested.

Real staging mode:

- Requires Supabase migrations applied.
- Requires Automation OS catalog seed data if the DB-backed catalog is expected.
- Requires platform service availability for auth/onboarding/API-backed flows.
- Requires explicit integration setup before any external send, post, booking, billing, or data sync can be called real.
- Requires human approval gates for risky external actions where the workflow requires approval.

## What Requires Integration

These capabilities remain integration-dependent and must not be described as live until connected and smoke-tested:

- Gmail or generic email sending.
- Google Calendar booking.
- Google Sheets read/write.
- WhatsApp Business messaging.
- LinkedIn actions through official APIs only; no scraping claims.
- CRM sync such as HubSpot, Zoho, Salesforce, or webhook-backed CRM flows.
- Shopify or ecommerce platform actions.
- ATS workflows.
- SMS gateways.
- Accounting systems.
- ERP, WMS, logistics, or manufacturing systems.
- Temporal durable workflow execution.
- Qdrant semantic memory.
- ClickHouse analytics beyond stub/demo output.
- Paid model execution if future model keys are configured.

## No Fake Integration Claims

- [ ] Do not say an integration is live unless credentials are configured and the staging smoke test proves it.
- [ ] Do not claim outbound email, WhatsApp, LinkedIn, SMS, calendar booking, CRM update, payment, invoice, or customer notification was sent unless the integration log proves it.
- [ ] Do not present demo/fallback data as customer production data.
- [ ] Do not imply LinkedIn scraping exists.
- [ ] Do not imply finance, tax, legal, medical, or regulated advice is final without required review and disclaimers.

## Rollback Plan

- [ ] Keep the previous known-good web deployment available.
- [ ] Keep the previous known-good platform image/tag available.
- [ ] If web deployment fails, roll back the web host to the previous deployment and rerun smoke routes.
- [ ] If platform deployment fails, roll back the platform service image/tag and verify `/healthz`.
- [ ] If migrations fail before completion, stop and inspect Prisma migration status before retrying.
- [ ] If a migration has already applied and must be reversed, create a forward corrective migration rather than manually editing staging schema.
- [ ] If seed data is wrong, fix the seed script or data source and rerun the idempotent seed; do not manually patch rows unless an incident note records it.
- [ ] After rollback, rerun:

```bash
WEB_URL=<staging-web-url> PLATFORM_URL=<staging-platform-url> pnpm smoke:demo
```

## Known Risks

- The platform service depends on correct staging `DATABASE_URL`, `DIRECT_DATABASE_URL`, and `AUTH_SECRET` configuration at runtime.
- Supabase migrations must be applied before DB-backed Automation OS routes can be considered ready.
- The Automation OS catalog seed must run after migrations when staging should use real database records.
- Web dashboard routes can render fallback/demo data if the database or platform integration is unavailable; this is acceptable only when explicitly labeled as demo mode.
- Existing lint output may include non-fatal platform warnings, but the lint command must exit successfully before deployment.
- The platform source default port differs from the Docker/hosting port unless `PORT` is set; staging should set the platform port explicitly.
- Optional Redis, Temporal, Qdrant, and ClickHouse services are not required for a buyer-demo staging stack, but production behavior depends on them.
- Existing documentation may mention older demo routes; this checklist is the Automation OS staging readiness source for the current `main` branch.

## Final Sign-Off

- [ ] Full validation commands passed.
- [ ] Supabase schema validated.
- [ ] Pending migrations applied to staging.
- [ ] Automation OS catalog seed completed if DB-backed staging is required.
- [ ] Web deployment complete.
- [ ] Platform deployment complete.
- [ ] Smoke routes checked.
- [ ] No env files, secrets, Supabase URL values, Render variables, or production credentials were changed.
