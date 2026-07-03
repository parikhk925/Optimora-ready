/**
 * Generic authorize() facade (T-2.5).
 *
 * The rest of the app calls authorize() and reads a structured Decision; it never
 * sees Cedar. A default provider is created lazily; a custom provider can be
 * injected (e.g. for tests or a future OPA sidecar). The wrapper guarantees
 * fail-closed behavior even if a provider misbehaves.
 */
import { CedarPolicyProvider } from "./cedar-provider.js";
import type { AuthorizeRequest, Decision, PolicyProvider } from "./types.js";

let defaultProvider: PolicyProvider | undefined;

export function getPolicyProvider(): PolicyProvider {
  defaultProvider ??= new CedarPolicyProvider();
  return defaultProvider;
}

/** Override the default provider (tests / alternative engines). */
export function setPolicyProvider(provider: PolicyProvider | undefined): void {
  defaultProvider = provider;
}

function denyClosed(req: AuthorizeRequest, reason: string): Decision {
  return {
    effect: "deny",
    allowed: false,
    reasons: [reason],
    determiningPolicies: [],
    metadata: {
      principalId: req.principal?.id ?? "unknown",
      principalType: req.principal?.type ?? "user",
      tenantId: req.principal?.tenantId ?? "unknown",
      action: req.action ?? "unknown",
      resourceType: req.resource?.type ?? "unknown",
      resourceId: req.resource?.id ?? "unknown",
      engine: "fail-closed",
      evaluatedAt: new Date().toISOString(),
    },
  };
}

/** Authorize a request, returning a structured, audit-ready decision. */
export function authorize(
  req: AuthorizeRequest,
  provider: PolicyProvider = getPolicyProvider(),
): Decision {
  // Minimal structural validation; anything malformed denies (fail closed).
  if (
    !req?.principal?.id ||
    !req.principal.tenantId ||
    !req.action ||
    !req.resource?.id ||
    !req.resource.tenantId
  ) {
    return denyClosed(req, "missing_required_context");
  }
  try {
    return provider.authorize(req);
  } catch (err) {
    return denyClosed(req, `engine_error:${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Convenience guard: throws if the decision is a deny. */
export function assertAuthorized(req: AuthorizeRequest, provider?: PolicyProvider): Decision {
  const decision = authorize(req, provider);
  if (!decision.allowed) {
    throw new PolicyDenyError(decision.reasons.join(", "), decision);
  }
  return decision;
}

export class PolicyDenyError extends Error {
  constructor(
    message: string,
    public readonly decision: Decision,
  ) {
    super(message);
    this.name = "PolicyDenyError";
  }
}
