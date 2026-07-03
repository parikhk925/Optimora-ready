-- Agency / White-Label Control Plane (E9 Agency). Tenant-scoped, fail-closed, RLS.

CREATE TABLE "agency_profiles" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             UUID NOT NULL,
  "agency_name"           TEXT NOT NULL,
  "brand_name"            TEXT NOT NULL,
  "logo_url"              TEXT,
  "accent_color"          TEXT,
  "support_email"         TEXT,
  "default_locale"        TEXT NOT NULL DEFAULT 'en-US',
  "default_currency"      TEXT NOT NULL DEFAULT 'USD',
  "allowed_client_regions" TEXT[] NOT NULL DEFAULT '{}',
  "enabled_modules"       JSONB NOT NULL DEFAULT '[]',
  "white_label_enabled"   BOOLEAN NOT NULL DEFAULT false,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON "agency_profiles" ("tenant_id");
CREATE UNIQUE INDEX ON "agency_profiles" ("tenant_id");

CREATE TABLE "client_workspaces" (
  "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"               UUID NOT NULL,
  "agency_org_id"           UUID NOT NULL,
  "client_name"             TEXT NOT NULL,
  "industry"                TEXT,
  "country_code"            TEXT NOT NULL DEFAULT 'GLOBAL',
  "region"                  TEXT,
  "jurisdiction_defaults"   JSONB NOT NULL DEFAULT '{}',
  "enabled_agents"          TEXT[] NOT NULL DEFAULT '{}',
  "enabled_modules"         TEXT[] NOT NULL DEFAULT '{}',
  "status"                  TEXT NOT NULL DEFAULT 'pending',
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON "client_workspaces" ("tenant_id");
CREATE INDEX ON "client_workspaces" ("agency_org_id");
CREATE INDEX ON "client_workspaces" ("status");

CREATE TABLE "feature_flags" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             UUID NOT NULL,
  "org_id"                UUID NOT NULL,
  "client_workspace_id"   UUID,
  "runtime"               BOOLEAN NOT NULL DEFAULT true,
  "memory"                BOOLEAN NOT NULL DEFAULT true,
  "tools"                 BOOLEAN NOT NULL DEFAULT true,
  "integrations"          BOOLEAN NOT NULL DEFAULT true,
  "finance_agent"         BOOLEAN NOT NULL DEFAULT false,
  "sales_agent"           BOOLEAN NOT NULL DEFAULT false,
  "support_agent"         BOOLEAN NOT NULL DEFAULT false,
  "reporting"             BOOLEAN NOT NULL DEFAULT false,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON "feature_flags" ("tenant_id");
CREATE INDEX ON "feature_flags" ("org_id");
CREATE INDEX ON "feature_flags" ("client_workspace_id");
CREATE UNIQUE INDEX ON "feature_flags" ("tenant_id", "org_id", "client_workspace_id")
  WHERE "client_workspace_id" IS NOT NULL;
CREATE UNIQUE INDEX ON "feature_flags" ("tenant_id", "org_id")
  WHERE "client_workspace_id" IS NULL;

CREATE TABLE "agency_events" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID NOT NULL,
  "ref_id"      UUID,
  "type"        TEXT NOT NULL,
  "payload"     JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON "agency_events" ("tenant_id");
CREATE INDEX ON "agency_events" ("ref_id");
