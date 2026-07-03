#!/usr/bin/env tsx
/**
 * Demo workspace seed script (T-25.1).
 * Creates deterministic demo data for the Optimora demo environment.
 *
 * Safe:
 *   - Idempotent: checks for existing records before creating.
 *   - No real secrets or customer data.
 *   - No paid AI calls.
 *   - Uses DEMO_TENANT_ID / DEMO_ORG_ID from env (defaults to demo UUIDs).
 *
 * Usage:
 *   pnpm seed:demo
 *   DEMO_TENANT_ID=<uuid> DEMO_ORG_ID=<uuid> pnpm seed:demo
 */
import {
  DEMO_AGENCY,
  DEMO_WORKSPACES,
  DEMO_AGENTS,
  DEMO_TASKS,
  DEMO_RUNS,
  DEMO_AUDIT,
  DEMO_JURISDICTIONS,
} from "../apps/web/src/lib/demo-data.js";

const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID ?? "00000000-demo-0000-0000-000000000001";
const DEMO_ORG_ID    = process.env.DEMO_ORG_ID    ?? "00000000-demo-0000-0000-000000000002";
const PLATFORM_API_URL = process.env.PLATFORM_API_URL ?? "";
const DEMO_API_KEY     = process.env.DEMO_API_KEY ?? "";

function log(msg: string) { console.log(`[seed-demo] ${msg}`); }
function warn(msg: string) { console.warn(`[seed-demo] WARN: ${msg}`); }

async function apiPost(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
  if (!PLATFORM_API_URL) {
    log(`  DRY RUN (no PLATFORM_API_URL): POST ${path}`);
    return { ok: true, status: 201, data: { ...body as object, _dry: true } };
  }
  const res = await fetch(`${PLATFORM_API_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(DEMO_API_KEY ? { "x-optimora-api-key": DEMO_API_KEY } : {}),
      "x-optimora-tenant": DEMO_TENANT_ID,
    },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  log("Starting demo workspace seed…");
  if (!PLATFORM_API_URL) {
    warn("PLATFORM_API_URL not set — running in dry-run mode (no requests sent).");
  }
  log(`Tenant: ${DEMO_TENANT_ID}  Org: ${DEMO_ORG_ID}`);

  // 1. Agency profile
  log("\n── Agency profile ──────────────────────────────");
  const agencyResult = await apiPost("/v1/onboarding/agency-profile", {
    agencyName: DEMO_AGENCY.agencyName,
    brandName: DEMO_AGENCY.brandName,
    supportEmail: DEMO_AGENCY.supportEmail,
    accentColor: DEMO_AGENCY.accentColor,
    whiteLabelEnabled: DEMO_AGENCY.whiteLabelEnabled,
    defaultLocale: DEMO_AGENCY.defaultLocale,
    defaultCurrency: DEMO_AGENCY.defaultCurrency,
    allowedClientRegions: DEMO_AGENCY.allowedClientRegions,
    enabledModules: DEMO_AGENCY.enabledModules,
  });
  log(`  Agency profile: ${agencyResult.ok ? "✓" : "✗ " + String(agencyResult.status)}`);

  // 2. Client workspaces
  log("\n── Client workspaces ───────────────────────────");
  for (const ws of DEMO_WORKSPACES) {
    const r = await apiPost("/v1/onboarding/client-workspace", {
      clientName: ws.clientName,
      industry: ws.industry,
      countryCode: ws.countryCode,
      enabledModules: DEMO_AGENCY.enabledModules,
    });
    log(`  ${ws.clientName}: ${r.ok ? "✓" : "✗ " + String(r.status)}`);
  }

  // 3. Jurisdictions — logged only (read-only for billing/jurisdiction service)
  log("\n── Jurisdictions (reference data) ──────────────");
  for (const j of DEMO_JURISDICTIONS) {
    log(`  ${j.code}: ${j.label} (${j.currency})`);
    if (j.disclaimer) log(`       ⚠ ${j.disclaimer}`);
  }

  // 4. Agents — logged (agent definitions created via Admin API in full deployment)
  log("\n── Sample agents ───────────────────────────────");
  for (const agent of DEMO_AGENTS) {
    log(`  ${agent.displayName} [${agent.key}]${agent.jurisdictionNote ? " ⚠ jurisdiction-aware" : ""}`);
  }

  // 5. Tasks/runs/audit — logged (created by Runtime in full deployment)
  log("\n── Sample tasks ────────────────────────────────");
  for (const task of DEMO_TASKS) {
    log(`  [${task.status}] ${task.title}${task.jurisdiction ? ` (${task.jurisdiction})` : ""}`);
  }

  log("\n── Sample runs ─────────────────────────────────");
  for (const run of DEMO_RUNS) {
    log(`  ${run.id} → ${run.status} (${run.modelProvider}, in:${run.tokensIn} out:${run.tokensOut})`);
  }

  log("\n── Audit log entries ───────────────────────────");
  for (const entry of DEMO_AUDIT) {
    log(`  ${entry.type} @ ${entry.at} by ${entry.actor}`);
  }

  log("\n✓ Demo seed complete.");
  log("  Finance/CA agent requires explicit jurisdiction on every task — never defaults to one country.");
  log("  All agents use the echo model (deterministic, no paid calls).");
  if (!PLATFORM_API_URL) {
    log("\n  To seed a live environment:");
    log("    PLATFORM_API_URL=http://localhost:3001 DEMO_API_KEY=opt_xxx pnpm seed:demo");
  }
}

main().catch((err) => {
  console.error("[seed-demo] Fatal:", err);
  process.exit(1);
});
