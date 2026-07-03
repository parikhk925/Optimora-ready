-- Adds workflow lifecycle status (draft/active/paused/archived), distinct from
-- the existing readiness `status` column (ready/demo/requires_integration).
ALTER TABLE "deployed_workflows"
  ADD COLUMN "lifecycle_status" TEXT NOT NULL DEFAULT 'draft';
