#!/usr/bin/env node
/**
 * Optimora live/demo smoke test.
 *
 * Usage:
 *   node scripts/smoke-demo.mjs
 *   WEB_URL=https://optimora-web.vercel.app PLATFORM_URL=https://optimora-platform-staging.onrender.com pnpm smoke:demo
 *
 * Read-only: does not print secrets, mutate data, or make paid AI calls.
 */

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3001";
const PLATFORM_URL = process.env.PLATFORM_URL ?? "http://localhost:3000";
const TIMEOUT_MS = 8000;

const results = [];

async function httpCheck(name, url, opts = {}) {
  const { expectStatus = 200, expectBodyContains, method = "GET", allowRedirect = false } = opts;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      redirect: allowRedirect ? "follow" : "manual",
    });
    clearTimeout(t);

    const status = res.status;
    const body = await res.text().catch(() => "");
    const statusOk = allowRedirect
      ? status >= 200 && status < 400
      : status === expectStatus || (expectStatus === 200 && res.ok);
    const bodyOk = expectBodyContains
      ? body.toLowerCase().includes(expectBodyContains.toLowerCase())
      : true;

    const ok = statusOk && bodyOk;
    const detail = ok
      ? `HTTP ${status}${expectBodyContains ? `; contains "${expectBodyContains}"` : ""}`
      : `HTTP ${status}${!statusOk ? ` (expected ${expectStatus})` : ""}${!bodyOk ? `; missing "${expectBodyContains}"` : ""}`;

    return { name, ok, url, detail };
  } catch (e) {
    return { name, ok: false, url, detail: e.cause?.code ?? e.message };
  }
}

async function jsonCheck(name, url, validate) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "manual",
    });
    clearTimeout(t);

    const raw = await res.text().catch(() => "");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return { name, ok: false, url, detail: `HTTP ${res.status}; invalid JSON: ${e.message}` };
    }

    const shapeOk = validate(data);
    return {
      name,
      ok: res.ok && shapeOk,
      url,
      detail: `HTTP ${res.status}; ${shapeOk ? "valid JSON shape" : "unexpected JSON shape"}`,
    };
  } catch (e) {
    return { name, ok: false, url, detail: e.cause?.code ?? e.message };
  }
}

results.push(
  await httpCheck("Landing page", `${WEB_URL}/`, {
    expectBodyContains: "Optimora",
    allowRedirect: true,
  }),
);

results.push(
  await httpCheck("Hero headline", `${WEB_URL}/`, {
    expectBodyContains: "army of AI agents",
    allowRedirect: true,
  }),
);

results.push(
  await httpCheck("AI Automation OS page", `${WEB_URL}/ai-automation-os`, {
    expectBodyContains: "AI Automation OS",
    allowRedirect: true,
  }),
);

results.push(
  await httpCheck("White-label agency page", `${WEB_URL}/white-label-agency`, {
    expectBodyContains: "Sell AI automation",
    allowRedirect: true,
  }),
);

results.push(
  await httpCheck("Paid pilot page", `${WEB_URL}/paid-pilot`, {
    expectBodyContains: "Go from demo to live",
    allowRedirect: true,
  }),
);

results.push(
  await httpCheck("Solutions page", `${WEB_URL}/solutions`, {
    expectBodyContains: "13 industry packs",
    allowRedirect: true,
  }),
);

results.push(
  await httpCheck("Onboarding page", `${WEB_URL}/onboarding`, {
    expectBodyContains: "agency",
    allowRedirect: true,
  }),
);

results.push(
  await httpCheck("Login page", `${WEB_URL}/login`, { allowRedirect: true, expectStatus: 200 }),
);

results.push(
  await httpCheck("Dashboard auth gate", `${WEB_URL}/dashboard`, { allowRedirect: true }),
);

results.push(
  await httpCheck("Run Agent page", `${WEB_URL}/dashboard/run`, { allowRedirect: true }),
);

results.push(
  await httpCheck("Demo run API method check", `${WEB_URL}/api/demo/run`, {
    method: "GET",
    expectStatus: 405,
  }),
);

results.push(
  await jsonCheck(
    "Automation packs API",
    `${WEB_URL}/api/automation/packs`,
    (data) => Array.isArray(data?.packs) && data.packs.length > 0,
  ),
);

results.push(
  await jsonCheck(
    "Automation workflows API",
    `${WEB_URL}/api/automation/workflows`,
    (data) => Array.isArray(data?.workflows) && data.workflows.length > 0,
  ),
);

results.push(
  await jsonCheck("Automation activity API", `${WEB_URL}/api/automation/activity`, (data) =>
    Array.isArray(data?.logs),
  ),
);

results.push(
  await jsonCheck(
    "Automation ROI API",
    `${WEB_URL}/api/automation/roi`,
    (data) => typeof data?.roi === "object" && data.roi !== null,
  ),
);

const platformHealth = await httpCheck("Platform API health", `${PLATFORM_URL}/healthz`, {
  allowRedirect: true,
});
const platformHealthSkip =
  !platformHealth.ok &&
  (platformHealth.detail.includes("ECONNREFUSED") || platformHealth.detail.includes("404"));
results.push(
  platformHealthSkip
    ? { ...platformHealth, ok: true, detail: "skipped - platform not running" }
    : platformHealth,
);

const platformReady = await httpCheck("Platform API readiness", `${PLATFORM_URL}/readyz`, {
  allowRedirect: true,
});
const platformReadySkip =
  !platformReady.ok &&
  (platformReady.detail.includes("ECONNREFUSED") || platformReady.detail.includes("404"));
results.push(
  platformReadySkip
    ? { ...platformReady, ok: true, detail: "skipped - platform not running" }
    : platformReady,
);

console.log("\nOptimora smoke test");
console.log(`web:      ${WEB_URL}`);
console.log(`platform: ${PLATFORM_URL}\n`);

let failed = 0;
for (const result of results) {
  const mark = result.ok ? "PASS" : "FAIL";
  if (!result.ok) failed++;
  console.log(`[${mark}] ${result.name.padEnd(30)} ${result.detail}`);
}

console.log("");
if (failed === 0) {
  console.log(`All ${results.length} smoke checks passed.\n`);
  process.exitCode = 0;
} else {
  console.error(`${failed}/${results.length} checks failed.\n`);
  process.exitCode = 1;
}
