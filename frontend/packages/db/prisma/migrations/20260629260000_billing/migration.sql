-- Billing / Plans / Usage Limits Foundation (E9 Billing). Tenant-scoped, fail-closed, RLS.
-- Plan definitions are code-level constants; only subscription records and events are persisted.

CREATE TABLE "billing_subscriptions" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"            UUID NOT NULL,
  "org_id"               UUID,
  "plan_key"             TEXT NOT NULL,
  "status"               TEXT NOT NULL DEFAULT 'trialing',
  "trial_ends_at"        TIMESTAMPTZ,
  "current_period_start" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "current_period_end"   TIMESTAMPTZ,
  "cancelled_at"         TIMESTAMPTZ,
  "custom_limits"        JSONB NOT NULL DEFAULT '{}',
  "external_ref"         TEXT,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON "billing_subscriptions" ("tenant_id");
CREATE INDEX ON "billing_subscriptions" ("org_id");
CREATE INDEX ON "billing_subscriptions" ("status");
CREATE UNIQUE INDEX ON "billing_subscriptions" ("tenant_id", "org_id")
  WHERE "org_id" IS NOT NULL;
CREATE UNIQUE INDEX ON "billing_subscriptions" ("tenant_id")
  WHERE "org_id" IS NULL;

CREATE TABLE "billing_events" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL,
  "sub_id"      UUID,
  "type"        TEXT NOT NULL,
  "payload"     JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON "billing_events" ("tenant_id");
CREATE INDEX ON "billing_events" ("sub_id");
