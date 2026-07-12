# Supabase and OAuth Readiness

This note records the current database and Google OAuth requirements for staging/production checks. It intentionally lists variable names and callback paths only. Do not paste secret values, Supabase URLs, provider credentials, or production credentials into this file.

## Supabase Database

Prisma is configured for Supabase/Postgres with two connection variables:

- `DATABASE_URL`: runtime database connection used by the application.
- `DIRECT_DATABASE_URL`: direct/non-pooled database connection used by Prisma migrations, schema validation, and privileged database tasks.

For Supabase deployments, prefer the pooled/session runtime URL for `DATABASE_URL` and the direct/non-pooled URL for `DIRECT_DATABASE_URL`. If using Supabase transaction pooling for Prisma runtime connections, confirm the connection string includes the Prisma-required pooler options recommended by Supabase for that mode.

Required validation commands:

```bash
pnpm --filter @optimora/db run db:generate
pnpm --filter @optimora/db exec prisma validate
pnpm --filter @optimora/db run db:deploy
pnpm --filter @optimora/db exec prisma migrate status
```

Use `db:deploy` for staging/production migrations. Do not use `db:migrate`, `db:reset`, `prisma migrate reset`, or `prisma db push` against staging or production.

## Google OAuth Variables

Google sign-in requires:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `PLATFORM_API_URL`
- `INTERNAL_AUTH_SECRET`
- `NEXT_PUBLIC_TENANT_ID`

Gmail connect requires:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `INTERNAL_AUTH_SECRET` or `AUTH_SECRET`

Google Calendar connect requires:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI`
- `INTERNAL_AUTH_SECRET` or `AUTH_SECRET`

## Google OAuth Callback Paths

Register these exact callback paths in the Google OAuth client for the deployed web origin:

- `/api/auth/oauth/google/callback`
- `/api/integrations/gmail/callback`
- `/api/integrations/google-calendar/callback`

For the current staging web origin, the callback host is:

```text
https://optimora-web.vercel.app
```

## Safety Rules

- Sign-in OAuth uses a random `state` value stored in a short-lived httpOnly cookie.
- Gmail and Google Calendar integration OAuth use a random `state` value plus a signed, short-lived httpOnly cookie that stores the tenant/org context.
- Integration callbacks reject missing, mismatched, tampered, or unsigned state.
- Gmail and Calendar connect routes require an authenticated Optimora session before starting OAuth.
- Integration OAuth must not claim that external actions are live until the provider tokens are connected and the integration path is manually verified.

## Live Check Results

Verified against `https://optimora-web.vercel.app`:

- `/login` renders the Google sign-in button.
- `/api/auth/oauth/google/start` returns HTTP `307` to Google and sets an httpOnly OAuth state cookie.
- `/api/integrations/gmail/connect` returns HTTP `401` when unauthenticated.
- `/api/integrations/google-calendar/connect` returns HTTP `401` when unauthenticated.

Not fully verified in this pass:

- Completing Google sign-in with a real Google account.
- Platform `/v1/auth/oauth/exchange` session creation after Google callback.
- Authenticated Gmail/Calendar consent, callback exchange, and DB persistence.

Those require a signed-in browser session and live provider credentials in Vercel/Google/Supabase. Do not bypass auth to test them.
