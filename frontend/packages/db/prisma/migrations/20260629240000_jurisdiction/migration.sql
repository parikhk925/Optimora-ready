-- Jurisdiction / Compliance Configuration Foundation (E9 Jurisdiction).
-- Versioned, tenant-scoped. No live tax logic.

CREATE TABLE "jurisdiction_configs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,
    "region" TEXT,
    "business_domain" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "profile" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurisdiction_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_jurisdiction_bindings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "jurisdiction_config_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_jurisdiction_bindings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_jurisdiction_refs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "jurisdiction_config_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_jurisdiction_refs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jurisdiction_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "jurisdiction_config_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurisdiction_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jurisdiction_configs_tenant_id_idx" ON "jurisdiction_configs"("tenant_id");
CREATE INDEX "jurisdiction_configs_org_id_idx" ON "jurisdiction_configs"("org_id");
CREATE INDEX "jurisdiction_configs_country_code_idx" ON "jurisdiction_configs"("country_code");
CREATE INDEX "jurisdiction_configs_business_domain_idx" ON "jurisdiction_configs"("business_domain");
CREATE INDEX "jurisdiction_configs_active_idx" ON "jurisdiction_configs"("active");
CREATE INDEX "agent_jurisdiction_bindings_tenant_id_idx" ON "agent_jurisdiction_bindings"("tenant_id");
CREATE INDEX "agent_jurisdiction_bindings_agent_id_idx" ON "agent_jurisdiction_bindings"("agent_id");
CREATE INDEX "agent_jurisdiction_bindings_jurisdiction_config_id_idx" ON "agent_jurisdiction_bindings"("jurisdiction_config_id");
CREATE INDEX "task_jurisdiction_refs_tenant_id_idx" ON "task_jurisdiction_refs"("tenant_id");
CREATE INDEX "task_jurisdiction_refs_task_id_idx" ON "task_jurisdiction_refs"("task_id");
CREATE INDEX "jurisdiction_events_tenant_id_idx" ON "jurisdiction_events"("tenant_id");
CREATE INDEX "jurisdiction_events_jurisdiction_config_id_idx" ON "jurisdiction_events"("jurisdiction_config_id");
