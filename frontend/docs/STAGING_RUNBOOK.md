# Optimora — Staging Deployment Runbook (T-31.1)

> Exact steps to deploy, verify, and roll back the Optimora staging environment.
> No secrets are stored in this file. All values must be set in your hosting provider or shell.

---

## Service tiers

| Service | Frontend-only demo | Full-stack demo | Production SaaS |
|---|:---:|:---:|:---:|
| **Web app** (Next.js) | Required | Required | Required |
| **Platform API** (Fastify) | Not needed | Required | Required |
| **PostgreSQL** | Not needed | Required | Required |
| **Redis** | Not needed | Optional (session cache) | Required |
| **Temporal** | Not needed | Not needed (demo uses sync route) | Required |
| **Qdrant** | Not needed | Not needed (memory stub) | Required |
| **ClickHouse** | Not needed | Not needed (analytics stub) | Required |

---

## Recommended minimal staging setup

### Web app — Vercel (recommended)

1. Import repo into Vercel.
2. Set root directory: `apps/web`.
3. Set build command: `cd ../.. && pnpm --filter @optimora/web build` (or Turbo: `turbo run build --filter=@optimora/web`).
4. Set output directory: `.next`.
5. Set framework preset: Next.js.
6. Add env vars (see §3 below) in Vercel → Settings → Environment Variables.
7. Deploy. Vercel handles CDN, edge functions, and HTTPS automatically.

> **Standalone mode note:** On Vercel, `NEXT_OUTPUT` must NOT be set — Vercel uses its own output format. The `output: "standalone"` path in `next.config.ts` is only activated when `NEXT_OUTPUT=standalone`, which the Docker build sets explicitly.

### Web app — Docker host (Fly.io / Railway / Render)

```bash
# Build from repo root
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_TENANT_ID=$NEXT_PUBLIC_TENANT_ID \
  -t optimora-web:staging .

# Run
docker run -d --name optimora-web \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e PLATFORM_API_URL=$PLATFORM_API_URL \
  -e NEXT_PUBLIC_TENANT_ID=$NEXT_PUBLIC_TENANT_ID \
  -e NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY \
  optimora-web:staging

# Verify
curl -sf http://localhost:3001/ | grep -q "Optimora" && echo "OK"
```

### Platform API — Render / Fly.io / Railway / Docker

```bash
# Build from repo root
docker build -f services/platform/Dockerfile \
  -t optimora-platform:staging .

# Run (minimum required vars)
docker run -d --name optimora-platform \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e AUTH_SECRET=$AUTH_SECRET \
  optimora-platform:staging

# Verify
curl -sf http://localhost:3000/healthz && echo "OK"
```

**Fly.io quick deploy:**
```bash
cd services/platform
fly launch --name optimora-platform-staging --no-deploy
fly secrets set DATABASE_URL="$DATABASE_URL" AUTH_SECRET="$AUTH_SECRET"
fly deploy
```

**Render:** use Docker runtime, set `Dockerfile path` to `services/platform/Dockerfile`, build context to repo root, add env vars in dashboard.

### PostgreSQL — Neon (recommended free tier)

1. Create project at neon.tech → copy connection string.
2. Set `DATABASE_URL` and `DIRECT_DATABASE_URL` (non-pooled for Prisma migrations).
3. Run migrations (see §4).

**Alternative:** Supabase, Railway Postgres, or Fly Postgres.

### Redis — Upstash (recommended serverless)

1. Create database at upstash.com → copy `REDIS_URL` (`rediss://...`).
2. Set `REDIS_URL` in platform env.
3. Platform degrades gracefully if Redis is unreachable — not required for demo.

### Temporal — Temporal Cloud (or skip for demo)

- Demo route (`POST /v1/demo/run`) is synchronous — **Temporal is not required for the buyer demo**.
- For production: create namespace at cloud.temporal.io, set `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`.

### Qdrant — Qdrant Cloud (or skip for demo)

- Memory module uses a stub when `QDRANT_URL` is unset. Safe to skip for demo.
- For production: create cluster at cloud.qdrant.io, set `QDRANT_URL` + `QDRANT_API_KEY`.

### ClickHouse — ClickHouse Cloud (or skip for demo)

- Analytics module uses a stub when `CLICKHOUSE_URL` is unset. Safe to skip for demo.
- For production: create service at clickhouse.cloud, set `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE`.

---

## Staging env checklist

Set these in your hosting provider's environment settings. Never hardcode values.

### Web app (Vercel / Docker)

```
PLATFORM_API_URL          # https://api-staging.example.com
NEXT_PUBLIC_TENANT_ID     # UUID — safe to expose
NEXT_PUBLIC_API_KEY       # opt_... — scoped read-only key, safe to expose
```

Do NOT set on web:
```
AUTH_SECRET               # server-side only
DATABASE_URL              # server-side only
DEMO_API_KEY              # seed script only, never in web runtime
```

### Platform API

```
NODE_ENV                  # production
PORT                      # 3000
DATABASE_URL              # postgresql://...?sslmode=require
DIRECT_DATABASE_URL       # same but non-pooled (for Prisma migrations)
AUTH_SECRET               # 32+ random chars — generate: openssl rand -base64 32
BASE_DOMAINS              # comma-separated allowed tenant domains
REDIS_URL                 # optional — redis://... or rediss://...
TEMPORAL_ADDRESS          # optional
TEMPORAL_NAMESPACE        # optional
QDRANT_URL                # optional
QDRANT_API_KEY            # optional
CLICKHOUSE_URL            # optional
CLICKHOUSE_USER           # optional
CLICKHOUSE_PASSWORD       # optional
CLICKHOUSE_DATABASE       # optional
```

---

## Post-deploy verification (run in order)

### 1. Env check

```bash
# Against local / CI environment
pnpm check:env --profile platform

# Quick manual check — verify AUTH_SECRET is not the insecure default
echo $AUTH_SECRET | wc -c   # should be > 32
```

### 2. Database migrations

```bash
# From repo root, pointing at staging DB
cd packages/db
DATABASE_URL="$DATABASE_URL" \
DIRECT_DATABASE_URL="$DIRECT_DATABASE_URL" \
npx prisma migrate deploy

# Verify migration status
DATABASE_URL="$DATABASE_URL" npx prisma migrate status
```

### 3. Seed demo data

```bash
# Dry-run first (no backend)
pnpm seed:demo

# Against live staging platform (requires DEMO_API_KEY)
PLATFORM_API_URL=https://api-staging.example.com \
DEMO_API_KEY=opt_... \
DEMO_TENANT_ID=<uuid> \
DEMO_ORG_ID=<uuid> \
pnpm seed:demo
```

### 4. Health checks

```bash
# Platform API
curl -sf https://api-staging.example.com/healthz

# Web app
curl -sf https://staging.example.com/ | grep -q "Optimora" && echo "OK"
```

### 5. Smoke test against live URL

```bash
WEB_URL=https://staging.example.com \
PLATFORM_URL=https://api-staging.example.com \
pnpm smoke:demo
```

Expected: `✓ All 13 smoke checks passed.`

---

## Rollback checklist

1. **Vercel:** go to Deployments → previous deployment → Promote to Production.
2. **Docker/Fly/Railway:** re-deploy previous image tag, e.g.:
   ```bash
   docker tag optimora-web:previous optimora-web:staging
   fly deploy --image optimora-web:previous   # Fly.io
   ```
3. **Database migrations:** Prisma does not auto-rollback. If a migration must be reverted:
   ```bash
   DATABASE_URL="$DATABASE_URL" npx prisma migrate resolve --rolled-back <migration_name>
   # Then manually revert schema changes and create a new migration
   ```
4. **Verify rollback:** re-run smoke test.
   ```bash
   WEB_URL=https://staging.example.com pnpm smoke:demo
   ```

---

## Buyer demo checklist (live staging URL)

Run this end-to-end before any buyer call.

- [ ] Landing page loads at `https://staging.example.com`
- [ ] Hero headline visible: "AI workforce"
- [ ] Industry Pack cards render (Financial Services, Healthcare, Legal, etc.)
- [ ] Finance/CA section shows IN / CA / US / GB / Global jurisdiction tabs
- [ ] "Start free" CTA → `/onboarding` loads
- [ ] Onboarding wizard step 1 accepts agency name
- [ ] Onboarding wizard completes all 7 steps without error
- [ ] Dashboard loads after onboarding
- [ ] "Run Agent" page (`/dashboard/run`) loads
- [ ] Select "Sales Agent" example → submit → result renders (echo model, no paid calls)
- [ ] Finance/CA agent → jurisdiction picker appears → select "CA" → submit → output includes jurisdiction + disclaimer
- [ ] Run output shows `modelProvider: echo`, `runStatus: succeeded`
- [ ] No real secrets visible in page source (`opt_` key is public SDK key — acceptable)
- [ ] Browser console shows no errors

---

## Troubleshooting

### Auth / magic-link not sending

- `AUTH_SECRET` must be set and at least 32 chars.
- Email provider (SMTP / Resend / SendGrid) must be configured — check platform logs.
- In dev/demo mode without email provider, magic-link URL is logged to platform stdout.
- Check: `fly logs -a optimora-platform-staging | grep magic`.

### CORS errors (web → platform)

- `PLATFORM_API_URL` in the web app must match the exact origin of the platform API (no trailing slash).
- Platform's allowed origins are controlled by `BASE_DOMAINS` env var.
- Verify: `curl -H "Origin: https://staging.example.com" -v https://api-staging.example.com/healthz` — look for `Access-Control-Allow-Origin` header.

### DATABASE_URL connection failures

- Confirm `?sslmode=require` is appended (Neon/Supabase require SSL).
- Use `DIRECT_DATABASE_URL` (non-pooled) for migrations; `DATABASE_URL` (pooled) for runtime.
- Test: `DATABASE_URL=$DATABASE_URL npx prisma db pull` — if it returns schema, connection is good.

### Platform API unreachable from web

- `PLATFORM_API_URL` must be the public URL, not `localhost`.
- Next.js Route Handlers run on the server — they can reach the platform at its public URL.
- Check platform health directly: `curl https://api-staging.example.com/healthz`.
- Check platform logs for startup errors (missing `AUTH_SECRET` → crashes on start).

### Smoke test partial failures

| Failing check | Likely cause |
|---|---|
| Landing page | Web app not deployed or wrong `WEB_URL` |
| Hero headline | Build used wrong branch — rebuild |
| Onboarding page | Auth middleware blocking without session — check middleware config |
| Demo run API 405 | Route not registered — check Next.js build output |
| Platform health | Platform not running or wrong `PLATFORM_URL` — check separately |

Run with verbose output:
```bash
WEB_URL=https://staging.example.com node scripts/smoke-demo.mjs
```

Each `[FAIL]` line shows the HTTP status or error code.

### Redis unreachable

Platform degrades gracefully — Redis is optional for demo. Check logs for `REDIS_URL not set` or connection timeout warnings. For full production, ensure `REDIS_URL` uses `rediss://` (TLS) for managed Redis providers.

### Temporal / Qdrant / ClickHouse not connected

All three are optional for the buyer demo. Platform uses stubs when these env vars are unset. Check logs for `[stub]` or `[disabled]` log lines. No action needed for demo.

---

## Next steps after staging verified

1. Run full buyer demo checklist with a real stakeholder.
2. Confirm `pnpm smoke:demo` against live URL passes.
3. Set up staging → production promotion workflow (Vercel: environment promotion; Docker: image tag promotion).
4. Configure real email provider for magic-link auth (Resend recommended).
5. Enable Temporal Cloud when ready for durable workflow execution.
