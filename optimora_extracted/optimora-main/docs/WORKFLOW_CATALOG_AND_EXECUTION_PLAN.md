# Workflow Catalog And Execution Plan

This plan defines the next engineering path for Optimora's multi-industry workflow catalog and execution engine. It is intentionally a plan only; do not implement the full catalog in this step.

## Goals

- Make every industry workflow explicit, typed, linkable, and reusable.
- Keep buyer-demo behavior honest: demo mode must be labeled and must not trigger external systems.
- Prepare a real workflow execution engine with state, approvals, logs, ROI updates, and integration boundaries.
- Keep dashboard, API, seed data, and docs aligned around one catalog source of truth.

## A. Workflow Catalog Model

Every workflow must include:

```ts
interface WorkflowCatalogItem {
  id: string;
  slug: string;
  name: string;
  industryKey: string;
  industryName: string;
  category: string;
  status: "demo" | "requires_integration" | "ready" | "custom_setup";
  businessUseCase: string;
  targetUser: string;
  trigger: string;
  requiredInputs: WorkflowInput[];
  businessObjects: string[];
  steps: WorkflowStep[];
  agents: WorkflowAgent[];
  approvalCheckpoints: ApprovalCheckpoint[];
  requiredIntegrations: RequiredIntegration[];
  fallbackMode: string;
  sampleOutput: WorkflowSampleOutput;
  activityEvents: ActivityEventTemplate[];
  roiMetrics: RoiMetricTemplate[];
  successCriteria: string[];
  failureModes: string[];
  setupNotes: string[];
  complianceNotes: string[];
}
```

Every workflow step must include:

```ts
interface WorkflowStep {
  stepNumber: number;
  stepName: string;
  agentKey: string;
  agentName: string;
  action: string;
  inputData: string[];
  outputData: string[];
  approvalRequired: boolean;
  integrationRequired: boolean;
  demoBehavior: string;
  activityLogText: string;
  possibleFailure: string;
  recoveryAction: string;
}
```

Supporting model notes:

- `slug` must be unique and stable because dashboard links depend on it.
- `industryKey` must match industry dashboard keys.
- `businessObjects` must use the canonical industry object names below.
- `requiredIntegrations` must distinguish demo-only, not connected, requires setup, and connected states.
- `sampleOutput` must be clearly safe demo output unless real integrations are connected and tested.
- `roiMetrics` must define how hours saved, cost avoided, revenue influenced, or risk reduced are calculated.

## B. Industry Business Objects

Agency:

- `client`
- `campaign`
- `prospect`
- `proposal`
- `report`

Real Estate:

- `lead`
- `property`
- `site_visit`
- `broker_task`
- `pipeline_opportunity`

HR:

- `candidate`
- `resume`
- `role`
- `interview`
- `shortlist`

Education:

- `inquiry`
- `student`
- `demo_class`
- `fee_reminder`
- `admission_pipeline`

Ecommerce:

- `order`
- `cart`
- `return_request`
- `support_ticket`
- `review_request`

Clinics:

- `appointment`
- `patient`
- `reminder`
- `doctor_schedule`
- `review_request`

Logistics:

- `shipment`
- `inventory_item`
- `delivery_exception`
- `vendor_task`
- `document`

SaaS/B2B:

- `lead`
- `trial_user`
- `demo`
- `churn_risk`
- `renewal`

Finance:

- `invoice`
- `payment`
- `document_request`
- `expense_summary`
- `compliance_task`

Legal/Professional:

- `client`
- `matter_or_project`
- `document`
- `deadline`
- `meeting_summary`

Restaurants/Hospitality:

- `reservation`
- `customer_feedback`
- `complaint`
- `inventory_task`
- `vendor_task`

Manufacturing:

- `production_report`
- `machine`
- `maintenance_alert`
- `raw_material`
- `dispatch`

Local Services:

- `booking`
- `customer`
- `payment_reminder`
- `review_request`
- `repeat_customer`

## C. Implementation Phases

Phase 1: catalog foundation

- Audit existing workflow data in `apps/web/src/lib/automation-data.ts` and related dashboard pages.
- Define stronger TypeScript types for workflow catalog items, steps, agents, integrations, approvals, ROI metrics, and activity events.
- Create an industry-neutral workflow catalog structure.
- Add validation helpers for duplicate slugs, missing industry keys, missing agent mappings, and broken dashboard links.

Phase 2: detailed workflow definitions

- Add 8-10 detailed workflows per industry.
- Ensure every industry pack workflow has a real definition.
- Map agents to workflow steps.
- Define required inputs, business objects, sample outputs, approval checkpoints, required integrations, failure modes, and recovery actions.
- Keep demo behavior explicit for every workflow step.

Phase 3: dashboard/API/seed alignment

- Update workflow detail pages to read from the catalog.
- Update industry detail pages to show catalog-backed workflow details.
- Update seed/demo data so DB-backed and static fallback modes expose the same workflow shape.
- Validate all slugs and links.
- Keep API responses consistent across static/demo and DB-backed paths.

Phase 4: execution engine

- Build a real workflow execution engine.
- Add run state machine states such as queued, running, waiting_for_approval, waiting_for_integration, succeeded, failed, and cancelled.
- Add approval pause/resume behavior.
- Persist run logs and activity events.
- Update ROI metrics from completed demo or real runs.
- Keep demo execution mode deterministic and clearly labeled.
- Do not trigger external integrations unless they are configured, connected, and tested.

## D. Compliance And Honesty Rules

- No LinkedIn scraping.
- Healthcare workflows must not diagnose or prescribe.
- Legal drafts require professional review.
- Finance and tax outputs require accountant/CA review.
- External integrations require setup unless truly connected.
- Demo mode must be clearly labeled.
- Outbound emails, WhatsApp messages, CRM writes, payment actions, calendar changes, LinkedIn actions, and Shopify actions must stay blocked until real integrations are connected and tested.
- Every workflow with an external side effect needs an approval checkpoint or an explicit integration-ready state.

## E. Success Criteria

- Every industry has proper workflow definitions.
- Every workflow has agent steps.
- Every workflow maps to business objects.
- Every workflow has approvals, integrations, ROI metrics, and log events.
- Dashboard pages use the catalog consistently.
- API routes return consistent catalog-backed shapes.
- Seed/demo data can populate the same model used by the UI.
- Demo execution mode is deterministic, safe, and labeled.
- Lint, typecheck, and build pass.

## Next Session Entry Point

Recommended next Codex session:

1. Start on latest `main`.
2. Audit current workflow data and routes.
3. Implement Phase 1 only.
4. Add targeted tests for catalog validation and route consistency.
5. Do not implement real external integration execution until catalog consistency is complete.
