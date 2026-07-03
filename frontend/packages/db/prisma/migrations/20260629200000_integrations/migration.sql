-- CreateTable
CREATE TABLE "connector_connections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "connector_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "secret_ref" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_invocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "capability_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invocation_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connector_connections_tenant_id_idx" ON "connector_connections"("tenant_id");
CREATE INDEX "connector_connections_org_id_idx" ON "connector_connections"("org_id");
CREATE INDEX "connector_connections_connector_key_idx" ON "connector_connections"("connector_key");

-- CreateIndex
CREATE INDEX "connector_invocations_tenant_id_idx" ON "connector_invocations"("tenant_id");
CREATE INDEX "connector_invocations_org_id_idx" ON "connector_invocations"("org_id");
CREATE INDEX "connector_invocations_connection_id_idx" ON "connector_invocations"("connection_id");

-- CreateIndex
CREATE INDEX "connector_events_tenant_id_idx" ON "connector_events"("tenant_id");
CREATE INDEX "connector_events_invocation_id_idx" ON "connector_events"("invocation_id");
