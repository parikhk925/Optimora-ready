/**
 * Cedar-backed PolicyProvider (T-2.5), using the in-process @cedar-policy/cedar-wasm
 * engine. This is the only module that knows about Cedar; everything else uses the
 * provider-agnostic types. Default-deny is inherent to Cedar (no permit -> deny),
 * and any engine error is mapped to a deny (fail closed).
 */
import { isAuthorized } from "@cedar-policy/cedar-wasm/nodejs";
import { OPTIMORA_POLICIES, POLICY_VERSION } from "./cedar-policies.js";
import type {
  AuthorizeRequest,
  Decision,
  DecisionMetadata,
  PolicyProvider,
  Principal,
  Scalar,
} from "./types.js";

const NS = "Optimora";
const T_USER = `${NS}::User`;
const T_APIKEY = `${NS}::ApiKey`;
const T_AGENT = `${NS}::Agent`;
const T_ROLE = `${NS}::Role`;
const T_ORG = `${NS}::Org`;
const T_TENANT = `${NS}::Tenant`;
const T_RESOURCE = `${NS}::Resource`;
const T_ACTION = `${NS}::Action`;

interface Euid {
  type: string;
  id: string;
}
interface EntityJson {
  uid: Euid;
  attrs: Record<string, unknown>;
  parents: Euid[];
}

function principalType(p: Principal): string {
  switch (p.type) {
    case "user":
      return T_USER;
    case "api_key":
      return T_APIKEY;
    case "agent":
      return T_AGENT;
  }
}

const entRef = (type: string, id: string): { __entity: Euid } => ({ __entity: { type, id } });

export class CedarPolicyProvider implements PolicyProvider {
  constructor(
    private readonly policies: string = OPTIMORA_POLICIES,
    private readonly policyVersion: string = POLICY_VERSION,
  ) {}

  authorize(req: AuthorizeRequest): Decision {
    const meta: DecisionMetadata = {
      principalId: req.principal.id,
      principalType: req.principal.type,
      tenantId: req.principal.tenantId,
      action: req.action,
      resourceType: req.resource.type,
      resourceId: req.resource.id,
      engine: `cedar:${this.policyVersion}`,
      evaluatedAt: new Date().toISOString(),
    };

    try {
      const call = this.buildCall(req);
      const answer = isAuthorized(call as never) as {
        type: "success" | "failure";
        response?: {
          decision: "allow" | "deny";
          diagnostics: { reason: string[]; errors: unknown[] };
        };
        errors?: { message?: string }[];
      };

      if (answer.type !== "success" || !answer.response) {
        const reasons = (answer.errors ?? []).map((e) => e.message ?? "policy_error");
        return {
          effect: "deny",
          allowed: false,
          reasons: reasons.length ? reasons : ["engine_failure"],
          determiningPolicies: [],
          metadata: meta,
        };
      }

      const { decision, diagnostics } = answer.response;
      if (decision === "allow") {
        return {
          effect: "allow",
          allowed: true,
          reasons: [],
          determiningPolicies: diagnostics.reason,
          metadata: meta,
        };
      }
      const reasons =
        diagnostics.errors.length > 0
          ? diagnostics.errors.map((e) => (e as { message?: string }).message ?? "policy_error")
          : ["no_matching_permit"];
      return { effect: "deny", allowed: false, reasons, determiningPolicies: [], metadata: meta };
    } catch (err) {
      // Fail closed on any unexpected engine error.
      return {
        effect: "deny",
        allowed: false,
        reasons: [`engine_error:${err instanceof Error ? err.message : String(err)}`],
        determiningPolicies: [],
        metadata: meta,
      };
    }
  }

  private buildCall(req: AuthorizeRequest): unknown {
    const entities = new Map<string, EntityJson>();
    const put = (e: EntityJson): void => {
      entities.set(`${e.uid.type}|${e.uid.id}`, e);
    };
    const ensureTenant = (id: string): void =>
      put({ uid: { type: T_TENANT, id }, attrs: {}, parents: [] });
    const ensureOrg = (id: string, tenantId: string): void =>
      put({ uid: { type: T_ORG, id }, attrs: {}, parents: [{ type: T_TENANT, id: tenantId }] });

    const p = req.principal;
    const pType = principalType(p);
    ensureTenant(p.tenantId);
    if (p.orgId) ensureOrg(p.orgId, p.tenantId);

    const principalAttrs: Record<string, unknown> = { tenant: entRef(T_TENANT, p.tenantId) };
    if (p.orgId) principalAttrs.org = entRef(T_ORG, p.orgId);
    const principalParents: Euid[] = [{ type: T_TENANT, id: p.tenantId }];
    if (p.orgId) principalParents.push({ type: T_ORG, id: p.orgId });

    if (p.type === "user" || p.type === "agent") {
      for (const role of p.roles) {
        put({ uid: { type: T_ROLE, id: role }, attrs: {}, parents: [] });
        principalParents.push({ type: T_ROLE, id: role });
      }
    }
    if (p.type === "api_key" || p.type === "agent") {
      principalAttrs.scopes = p.scopes;
    }
    if ((p.type === "user" || p.type === "agent") && p.permissions) {
      principalAttrs.permissions = p.permissions;
    }
    if ((p.type === "user" || p.type === "agent") && p.attributes) {
      for (const [k, v] of Object.entries(p.attributes)) principalAttrs[k] = v;
    }

    put({ uid: { type: pType, id: p.id }, attrs: principalAttrs, parents: principalParents });

    // Resource (its tenant/org may differ from the principal's — that is exactly
    // what enforces cross-tenant denial).
    const r = req.resource;
    ensureTenant(r.tenantId);
    if (r.orgId) ensureOrg(r.orgId, r.tenantId);
    const resourceAttrs: Record<string, unknown> = {
      resourceType: r.type,
      tenant: entRef(T_TENANT, r.tenantId),
    };
    if (r.orgId) resourceAttrs.org = entRef(T_ORG, r.orgId);
    for (const [k, v] of Object.entries(r.attributes ?? {})) resourceAttrs[k] = v;
    const resourceParents: Euid[] = [{ type: T_TENANT, id: r.tenantId }];
    if (r.orgId) resourceParents.push({ type: T_ORG, id: r.orgId });
    put({ uid: { type: T_RESOURCE, id: r.id }, attrs: resourceAttrs, parents: resourceParents });

    // Action entity.
    put({ uid: { type: T_ACTION, id: req.action }, attrs: {}, parents: [] });

    const context: Record<string, Scalar> = req.context ?? {};

    return {
      principal: { type: pType, id: p.id },
      action: { type: T_ACTION, id: req.action },
      resource: { type: T_RESOURCE, id: r.id },
      context,
      policies: { staticPolicies: this.policies },
      entities: Array.from(entities.values()),
      validateRequest: false,
    };
  }
}
