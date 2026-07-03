-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "sender_kind" TEXT NOT NULL,
    "sender_node_id" UUID,
    "recipient_node_id" UUID NOT NULL,
    "broadcast_group_id" UUID,
    "relationship" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "task_id" UUID,
    "plan_id" UUID,
    "decision_id" UUID,
    "critique_id" UUID,
    "learning_record_id" UUID,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_tenant_id_idx" ON "messages"("tenant_id");

-- CreateIndex
CREATE INDEX "messages_org_id_idx" ON "messages"("org_id");

-- CreateIndex
CREATE INDEX "messages_recipient_node_id_idx" ON "messages"("recipient_node_id");

-- CreateIndex
CREATE INDEX "messages_sender_node_id_idx" ON "messages"("sender_node_id");

-- CreateIndex
CREATE INDEX "messages_thread_id_idx" ON "messages"("thread_id");

-- CreateIndex
CREATE INDEX "communication_events_tenant_id_idx" ON "communication_events"("tenant_id");

-- CreateIndex
CREATE INDEX "communication_events_message_id_idx" ON "communication_events"("message_id");
