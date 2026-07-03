-- CreateTable
CREATE TABLE "org_nodes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_edges" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "from_node_id" UUID NOT NULL,
    "to_node_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_node_versions" (
    "id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_node_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "org_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_nodes_tenant_id_idx" ON "org_nodes"("tenant_id");

-- CreateIndex
CREATE INDEX "org_nodes_org_id_idx" ON "org_nodes"("org_id");

-- CreateIndex
CREATE INDEX "org_edges_tenant_id_idx" ON "org_edges"("tenant_id");

-- CreateIndex
CREATE INDEX "org_edges_from_node_id_idx" ON "org_edges"("from_node_id");

-- CreateIndex
CREATE INDEX "org_edges_to_node_id_idx" ON "org_edges"("to_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_edges_from_node_id_to_node_id_type_key" ON "org_edges"("from_node_id", "to_node_id", "type");

-- CreateIndex
CREATE INDEX "org_node_versions_tenant_id_idx" ON "org_node_versions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_node_versions_node_id_version_key" ON "org_node_versions"("node_id", "version");

-- CreateIndex
CREATE INDEX "org_events_tenant_id_idx" ON "org_events"("tenant_id");

-- CreateIndex
CREATE INDEX "org_events_org_id_idx" ON "org_events"("org_id");

-- AddForeignKey
ALTER TABLE "org_edges" ADD CONSTRAINT "org_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_edges" ADD CONSTRAINT "org_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_node_versions" ADD CONSTRAINT "org_node_versions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
