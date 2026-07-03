import { describe, it, expect } from "vitest";
import {
  PACKAGE_NAME,
  MissingTenantContextError,
  assertTenant,
  buildWorkflowId,
  taskQueueForTenant,
  tenantMemo,
} from "./index.js";

const TENANT = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";

describe("@optimora/execution naming (unit)", () => {
  it("exposes its package name", () => {
    expect(PACKAGE_NAME).toBe("@optimora/execution");
  });

  it("fails closed without a tenant (MissingTenantContextError)", () => {
    expect(() => assertTenant(undefined)).toThrow(MissingTenantContextError);
    expect(() => assertTenant("")).toThrow(MissingTenantContextError);
    expect(() => taskQueueForTenant("")).toThrow(MissingTenantContextError);
    expect(() => buildWorkflowId({ tenantId: "", workflowType: "x" })).toThrow(
      MissingTenantContextError,
    );
  });

  it("carries tenant/org context in task queue, workflow id, and memo", () => {
    expect(taskQueueForTenant(TENANT)).toBe(`optimora.${TENANT}`);
    const id = buildWorkflowId({
      tenantId: TENANT,
      orgId: ORG,
      workflowType: "greetWorkflow",
      key: "k1",
    });
    expect(id).toBe(`opt/${TENANT}/${ORG}/greetWorkflow/k1`);
    expect(tenantMemo({ tenantId: TENANT, orgId: ORG })).toEqual({ tenantId: TENANT, orgId: ORG });
  });

  it("generates unique workflow ids when no key is given", () => {
    const a = buildWorkflowId({ tenantId: TENANT, workflowType: "w" });
    const b = buildWorkflowId({ tenantId: TENANT, workflowType: "w" });
    expect(a).not.toBe(b);
  });
});
