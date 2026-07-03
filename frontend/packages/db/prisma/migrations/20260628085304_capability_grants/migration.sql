-- CreateTable
CREATE TABLE "capability_grants" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID,
    "task_id" UUID,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capability_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capability_grants_tenant_id_idx" ON "capability_grants"("tenant_id");

-- CreateIndex
CREATE INDEX "capability_grants_agent_id_idx" ON "capability_grants"("agent_id");
