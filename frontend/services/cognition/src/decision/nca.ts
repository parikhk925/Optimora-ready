/**
 * Nearest common ancestor over the `manages` hierarchy (T-8.3), used for conflict
 * resolution. Computed with the existing org-graph ancestors() traversal — the
 * Org Graph is not modified. Runs under tenant context (RLS), so cross-tenant
 * nodes are invisible and never resolve.
 */
import type { TxClient } from "@optimora/db";
import { ancestors } from "@optimora/org-graph";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The lowest node that is `manages`-ancestor-or-self of both a and b, or null.
 * Returns null (fail closed) on malformed ids or when no common ancestor exists
 * (incl. cross-tenant, where RLS hides the nodes).
 */
export async function nearestCommonAncestor(
  tx: TxClient,
  a: string,
  b: string,
): Promise<string | null> {
  if (!UUID_RE.test(a) || !UUID_RE.test(b)) return null;
  if (a === b) return a;

  const ancA = (await ancestors(tx, a, "manages")).sort((x, y) => x.depth - y.depth);
  const ancB = (await ancestors(tx, b, "manages")).sort((x, y) => x.depth - y.depth);

  const setA = new Set<string>([a, ...ancA.map((n) => n.id)]);
  for (const node of [b, ...ancB.map((n) => n.id)]) {
    if (setA.has(node)) return node; // nearest-first, so first hit is the lowest
  }
  return null;
}
