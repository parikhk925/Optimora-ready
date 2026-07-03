// Smoke test for the local dev stack (T-1.3).
// Verifies each frozen-infra service is reachable from the host on its mapped port.
// Run after `pnpm infra:up`:  node infra/docker/smoke-test.mjs   (or: pnpm infra:smoke)

import net from "node:net";

const TIMEOUT_MS = 4000;

function tcpCheck(name, host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok, detail) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ name, ok, detail });
    };
    socket.setTimeout(TIMEOUT_MS);
    socket.once("connect", () => finish(true, `tcp ${host}:${port} open`));
    socket.once("timeout", () => finish(false, `tcp ${host}:${port} timeout`));
    socket.once("error", (e) => finish(false, `tcp ${host}:${port} ${e.code ?? e.message}`));
    socket.connect(port, host);
  });
}

async function httpCheck(name, url, expectStatusOk = true) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const ok = expectStatusOk ? res.ok : true;
    return { name, ok, detail: `${url} -> HTTP ${res.status}` };
  } catch (e) {
    return { name, ok: false, detail: `${url} ${e.cause?.code ?? e.message}` };
  }
}

const checks = [
  () => tcpCheck("PostgreSQL", "127.0.0.1", 5433),
  () => httpCheck("Qdrant", "http://127.0.0.1:6333/readyz"),
  () => httpCheck("ClickHouse", "http://127.0.0.1:8123/ping"),
  () => tcpCheck("Redis", "127.0.0.1", 6380),
  () => tcpCheck("Temporal", "127.0.0.1", 7233),
  () => httpCheck("Temporal UI", "http://127.0.0.1:8233/", false),
];

const results = [];
for (const c of checks) results.push(await c());

let failed = 0;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) failed++;
  console.log(`[${mark}] ${r.name.padEnd(12)} ${r.detail}`);
}

console.log("");
if (failed === 0) {
  console.log(`Smoke test: ALL ${results.length} services reachable.`);
  // Set exitCode and let the event loop drain naturally. Calling process.exit()
  // here can trip a libuv handle-closing assertion on Windows while sockets
  // are still tearing down.
  process.exitCode = 0;
} else {
  console.error(`Smoke test: ${failed}/${results.length} checks FAILED.`);
  process.exitCode = 1;
}
