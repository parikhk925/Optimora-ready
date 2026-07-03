# Staging Demo Login

This guide documents the safe demo login path for staging and buyer-demo deployments.

## Enable

Enable demo login intentionally with at least one of these environment variables:

```bash
STAGING_DEMO_LOGIN=true
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

The safest staging setting is `STAGING_DEMO_LOGIN=true`. Avoid enabling generic demo flags on any customer production deployment.

Only variable names and boolean flags are required. Do not store secrets in these variables.

## Manual Vercel Setup

1. Open the Vercel project for the staging/demo web deployment.
2. Add `STAGING_DEMO_LOGIN=true` to the staging/demo environment.
3. Redeploy the latest `main` commit.
4. Verify `/login` shows:

```text
Continue with Demo Workspace
```

Do not add secrets or production credentials to this setting.

## Safety Rules

- Local development may use the stub session only when `NODE_ENV !== "production"` and `PLATFORM_API_URL` is not set.
- Deployed staging/demo may use demo login only when `STAGING_DEMO_LOGIN=true`, `DEMO_MODE=true`, or `NEXT_PUBLIC_DEMO_MODE=true`.
- Production with `PLATFORM_API_URL` configured uses real platform auth.
- Missing `PLATFORM_API_URL` no longer enables demo or dev auth in production.
- Demo login creates a demo-only session with the demo workspace identity.
- Demo login does not expose tokens or secrets to browser JavaScript.
- Demo tokens must not be forwarded to platform actions.
- Demo routes must not send real emails, WhatsApp messages, CRM updates, payments, LinkedIn actions, or other external integration calls.
- Integration surfaces must remain labeled as Demo Mode, Requires Integration, or Not Connected until real OAuth/API credentials are connected.

## Login Flow

When demo login is enabled, `/login` shows:

```text
Continue with Demo Workspace
```

The button calls:

```text
POST /api/auth/demo-login
```

The route is disabled unless one of the demo flags is explicitly set to `true`.

## Disable

Remove or set these variables to anything other than `true`:

```bash
STAGING_DEMO_LOGIN
DEMO_MODE
NEXT_PUBLIC_DEMO_MODE
```

After disabling, redeploy the web app and verify `/login` no longer shows the demo button and `POST /api/auth/demo-login` returns `404`.

## Production Warning

Do not enable staging demo login on the production customer deployment. Demo login is for staging verification, buyer demos, and safe internal review only. Real customer authentication must use the platform magic-link flow backed by `PLATFORM_API_URL`.
