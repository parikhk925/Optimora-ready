/**
 * Per-org namespacing helpers (T-1.5).
 *
 * Tenant/org isolation in the non-relational stores is enforced by naming:
 *   - Qdrant : a separate collection per org (hard isolation), `org_<uuid>_<name>`
 *   - ClickHouse : shared OLAP tables partitioned/filtered by a validated org_id
 *
 * All helpers validate their inputs and fail closed (throw) on malformed values,
 * so a bad id can never produce a collection/identifier that straddles tenants.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Suffix for a namespaced resource: lowercase, starts with a letter. */
const SUFFIX_RE = /^[a-z][a-z0-9_]{0,48}$/;

/** Throw unless `value` is a well-formed UUID. */
export function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected a UUID, received "${value}".`);
  }
}

/** Throw unless `value` is a safe resource suffix (collection/table base name). */
export function assertSuffix(value: string, label: string): void {
  if (!SUFFIX_RE.test(value)) {
    throw new Error(
      `Invalid ${label}: must match ${SUFFIX_RE} (lowercase, start with a letter), received "${value}".`,
    );
  }
}

/**
 * Deterministic Qdrant collection name for an org's named vector space.
 * UUID dashes are stripped so the name is a valid identifier across stores.
 * Example: qdrantOrgCollection("3f2504e0-4f89-41d3-9a0c-0305e82c3301", "memory")
 *          -> "org_3f2504e04f8941d39a0c0305e82c3301_memory"
 */
export function qdrantOrgCollection(orgId: string, name: string): string {
  assertUuid(orgId, "orgId");
  assertSuffix(name, "collection name");
  return `org_${orgId.replace(/-/g, "")}_${name}`;
}

/**
 * Validate and return an org id for use as a bound ClickHouse query parameter.
 * Analytics queries MUST scope by this value; centralizing the guard keeps the
 * "every OLAP read/write is org-scoped" invariant enforceable.
 */
export function clickhouseOrgScope(orgId: string): string {
  assertUuid(orgId, "orgId");
  return orgId;
}
