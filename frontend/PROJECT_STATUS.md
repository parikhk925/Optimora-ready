# PROJECT_STATUS

Last updated: 2026-07-12

## Current Repository

- Active repo: `parikhk925/Optimora-ready`
- Product monorepo root: `frontend/`
- Root backend scaffold: `backend/`
- Current focus: staging and buyer-demo readiness with honest integration boundaries.

## Current Validation Baseline

Run from `frontend/` unless noted:

```bash
CI=true pnpm install
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm build
pnpm --filter @optimora/web test
pnpm --filter @optimora/db run db:generate
pnpm --filter @optimora/db exec prisma validate
WEB_URL=<staging-web-url> PLATFORM_URL=<staging-platform-url> pnpm smoke:demo
```

Run from repo root for the FastAPI scaffold:

```bash
python -m pytest backend -q
```

Prisma validation requires `DATABASE_URL` and `DIRECT_DATABASE_URL` in the process environment. Do not commit values.

## Recently Hardened

- Frontend validation gates pass after removing stale PDF-polyfill lint warnings.
- Turbo serializes `@optimora/db#typecheck` after `@optimora/db#build` to avoid concurrent Prisma client generation locks.
- Smoke script now expects protected Activity and ROI APIs to return `401` with valid JSON when unauthenticated.
- Root FastAPI scaffold imports without database env vars, exposes `/api/healthz` and `/api/readyz`, fails DB-backed routes closed with `503`, and avoids credentialed wildcard CORS.
- Public inbound webhooks now fail closed in production unless `WEBHOOK_SIGNING_SECRET` is configured or unsigned webhook mode is explicitly enabled for staging/demo.

## What Is Demo/Sample Ready

- Public marketing pages.
- Buyer-demo dashboard navigation when authenticated or in local dev stub mode.
- Industry packs, workflow templates, activity, ROI, integration status, and workflow detail surfaces.
- HR resume upload UI and server route, when Vercel Blob and auth/session requirements are configured.
- Live smoke coverage for public routes, protected API auth gates, and platform health/readiness.

## What Requires Real Configuration

- Real customer auth through platform magic link or Google OAuth.
- Vercel Blob for resume storage.
- Gmail and Google Calendar OAuth.
- Supabase/Postgres migrations and seed data for DB-backed Automation OS.
- Platform service runtime env vars.
- `WEBHOOK_SIGNING_SECRET` for production inbound workflow webhooks.
- Billing provider setup before real checkout/payment claims.
- WhatsApp, LinkedIn, Shopify, CRM, ATS, SMS, accounting, ERP, and other external systems.
- Temporal/Qdrant/ClickHouse-backed production behavior where those services are expected.

## Honesty Rules

- Do not claim external actions are live unless credentials are configured and a staging smoke test proves it.
- Do not claim LinkedIn scraping exists.
- Do not present sample/demo data as real customer data.
- Do not commit `.env`, secrets, Supabase URL values, Render/Vercel variables, or production credentials.
- Keep finance, legal, healthcare, and other regulated workflows review-gated and clearly caveated.

## Remaining Enterprise Gaps

- Formal SOC 2/security/compliance controls are not implemented in this repo.
- Production incident response, audit retention policy, SSO/SAML, SCIM, customer data lifecycle, backup/restore drills, and tenant-level admin controls need dedicated implementation/verification.
- External integrations require provider-specific security reviews and end-to-end tests.
- Paid-pilot readiness depends on configured staging credentials and a guided live verification run.
