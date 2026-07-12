# Optimora Ready

This repository contains the current Optimora staging-ready application.

## Repository Layout

- `frontend/` - primary Optimora monorepo: Next.js web app, platform service, Prisma database package, shared packages, smoke scripts, deployment docs.
- `backend/` - small FastAPI service scaffold with explicit health/readiness checks and MongoDB-backed status endpoints.
- `tests/`, `test_reports/`, `memory/`, `.emergent/`, `.claude/` - project/testing support artifacts.

## Primary App

Work from `frontend/` for the Optimora product:

```bash
cd frontend
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @optimora/web test
```

Database validation requires database URLs in the shell environment, not committed files:

```bash
pnpm --filter @optimora/db run db:generate
pnpm --filter @optimora/db exec prisma validate
```

## Backend Scaffold

Run the FastAPI checks from the repository root:

```bash
python -m pytest backend -q
```

The backend imports without database credentials. `/api/healthz` remains available, `/api/readyz` reports degraded when `MONGO_URL` or `DB_NAME` is not configured, and DB-backed status routes fail closed with `503`.

## Deployment Honesty

This repo includes demo, staging, and integration-ready surfaces. Do not claim external systems are live unless their credentials are configured and tested:

- Gmail and Google Calendar require OAuth setup.
- Resume uploads require Vercel Blob configuration.
- WhatsApp, LinkedIn, Shopify, CRM, ATS, payments, and other external systems remain integration-dependent unless proven otherwise.
- Demo/sample data must not be presented as production customer data.

Do not commit `.env`, secrets, Supabase URLs, Render/Vercel variables, or production credentials.
