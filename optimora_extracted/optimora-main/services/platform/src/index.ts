/**
 * @optimora/platform — API gateway / BFF service.
 * Resolves tenant context and injects it into the DB session (T-1.6).
 */
export const PACKAGE_NAME = "@optimora/platform" as const;

export { buildServer, type BuildServerOptions } from "./server.js";
export {
  resolveTenantContext,
  type ResolvedTenantContext,
  type ResolvableRequest,
  type TenantLookup,
  type ResolverOptions,
} from "./tenant-resolution.js";
export { createSystemLookup } from "./lookup.js";
export {
  type AuthProvider,
  type EmailSender,
  type MagicLinkMessage,
  StubEmailSender,
  emailProvider,
} from "./auth/providers.js";
export {
  AuthError,
  type AuthDeps,
  type IssuedTokens,
  requestMagicLink,
  verifyMagicLink,
  refreshSession,
  logout,
  readSession,
} from "./auth/service.js";
export {
  type ApiKeyRecord,
  type CreatedApiKey,
  type ApiKeyIdentity,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  verifyApiKeyRaw,
  generateApiKey,
  parseApiKey,
} from "./auth/api-key.js";
export {
  type RoleView,
  createRole,
  updateRole,
  deleteRole,
  listRoles,
  assignRole,
  removeRole,
  seedSystemRoles,
  buildUserPrincipal,
  RoleNotFoundError,
  RoleImmutableError,
} from "./rbac/service.js";
export { getCallerPrincipal, requirePermission } from "./rbac/guard.js";
export {
  authorizeWithOrgGraph,
  relationHolds,
  type OrgRelation,
  type GraphAuthorizeInput,
} from "./rbac/graph-authz.js";
export {
  type CapabilityClaims,
  type IssuedCapability,
  CAPABILITY_TTL_SECONDS,
  issueCapability,
  revokeCapability,
  decodeCapabilityToken,
  verifyCapability,
  agentPrincipalFromCapability,
  authorizeAgentAction,
} from "./auth/capability.js";

/** Start the gateway when run directly. */
async function main(): Promise<void> {
  const { buildServer } = await import("./server.js");
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`@optimora/platform gateway listening on :${port}`);
}

// Run only when this module is the entry point (not when imported by tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
