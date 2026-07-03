/**
 * Mock CRM integration — always mock, used by demo workflows (Lead
 * Qualification Agent, Ecommerce Order Follow-Up Agent). Persists to the
 * BusinessObject table (objectType "crm_lead") so state is real and visible
 * inside the workspace, while being clearly labeled as a demo CRM (not a real
 * HubSpot/Zoho/Salesforce integration).
 */
import type { IntegrationActionContext, IntegrationActionResult, IntegrationProvider } from "./base";

export const mockCrmIntegration: IntegrationProvider = {
  key: "crm",

  async executeAction(ctx: IntegrationActionContext, action: string, payload: Record<string, unknown>): Promise<IntegrationActionResult> {
    const objectType = typeof payload.objectType === "string" ? payload.objectType : "crm_lead";
    const externalId = (payload.leadId as string | undefined)
      ?? (payload.externalId as string | undefined)
      ?? (payload.email as string | undefined)
      ?? `${objectType}-${Date.now()}`;

    if (action === "create_lead" || action === "update_lead") {
      const existing = await ctx.tx.businessObject.findFirst({
        where: { workspaceId: ctx.workspaceId, objectType, externalId },
      });
      const data = {
        name: payload.name ?? existing?.data ?? {},
        email: payload.email,
        source: payload.source ?? "workflow",
        ...(typeof existing?.data === "object" && existing?.data ? existing.data as object : {}),
        ...payload,
      };
      const record = existing
        ? await ctx.tx.businessObject.update({
            where: { id: existing.id },
            data: { data: data as never, displayName: String(payload.name ?? existing.displayName) },
          })
        : await ctx.tx.businessObject.create({
            data: {
              tenantId: ctx.tenantId,
              orgId: ctx.orgId,
              workspaceId: ctx.workspaceId,
              objectType,
              externalId,
              displayName: String(payload.name ?? externalId),
              status: "active",
              data: data as never,
            },
          });
      return {
        status: "mock",
        output: { leadId: record.id, externalId, action },
        label: "Mock CRM (demo data store — not a real HubSpot/Zoho/Salesforce connection)",
      };
    }

    if (action === "add_note" || action === "mark_qualified") {
      const existing = await ctx.tx.businessObject.findFirst({
        where: { workspaceId: ctx.workspaceId, objectType, externalId },
      });
      if (!existing) {
        return { status: "failed", output: {}, label: "Mock CRM", error: `Lead ${externalId} not found for ${action}.` };
      }
      const currentData = (existing.data as Record<string, unknown>) ?? {};
      const notes = Array.isArray(currentData.notes) ? (currentData.notes as unknown[]) : [];
      const nextData = action === "add_note"
        ? { ...currentData, notes: [...notes, { text: payload.note ?? "", createdAt: new Date().toISOString() }] }
        : { ...currentData, qualified: true };
      const record = await ctx.tx.businessObject.update({ where: { id: existing.id }, data: { data: nextData as never } });
      return {
        status: "mock",
        output: { leadId: record.id, action },
        label: "Mock CRM (demo data store — not a real HubSpot/Zoho/Salesforce connection)",
      };
    }

    return { status: "failed", output: {}, label: "Mock CRM", error: `Unknown CRM action: ${action}` };
  },

  async testConnection(): Promise<IntegrationActionResult> {
    return { status: "mock", output: { connected: true }, label: "Mock CRM (always available — demo data store)" };
  },
};
