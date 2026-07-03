#!/usr/bin/env tsx
/**
 * Environment validation script (T-28.1).
 * Checks all required and recommended env vars for:
 *   - Web app (Next.js)
 *   - Platform API (Fastify)
 *   - Database (Postgres via Prisma)
 *   - Redis, Temporal, Qdrant, ClickHouse
 *   - Auth secrets
 *
 * Usage:
 *   pnpm check:env              — check current shell env
 *   pnpm check:env --profile web        — web-only vars
 *   pnpm check:env --profile platform   — platform-only vars
 *   pnpm check:env --profile demo       — demo/dev vars (relaxed)
 *
 * Exit codes: 0 = all required vars present, 1 = missing required vars.
 * Does NOT print secret values — only presence/absence.
 */

const args = process.argv.slice(2);
const profileArg = args.find((a) => a.startsWith("--profile="))?.split("=")[1]
  ?? (args[args.indexOf("--profile") + 1]);
const profile = profileArg ?? "all";

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
  profiles: string[];
  sensitive: boolean;
  /** If true, warn when value equals the insecure default */
  insecureDefault?: string;
}

const ENV_VARS: EnvVar[] = [
  // ── Web app ──────────────────────────────────────────────────────────────────
  {
    key: "PLATFORM_API_URL",
    required: false,
    description: "Base URL of the Platform API (e.g. https://api.optimora.ai). When unset, web runs in dev/demo mode.",
    profiles: ["web", "all"],
    sensitive: false,
  },
  {
    key: "NEXT_PUBLIC_API_KEY",
    required: false,
    description: "Public SDK API key (must start with opt_). When unset, SDK calls use mock data.",
    profiles: ["web", "all"],
    sensitive: true,
  },
  {
    key: "NEXT_PUBLIC_TENANT_ID",
    required: false,
    description: "Default tenant UUID for the web app. Used in dev/demo mode.",
    profiles: ["web", "all"],
    sensitive: false,
  },

  // ── Platform API ──────────────────────────────────────────────────────────────
  {
    key: "AUTH_SECRET",
    required: true,
    description: "32+ char secret for JWT signing and cookie encryption. Must be unique per environment.",
    profiles: ["platform", "all"],
    sensitive: true,
    insecureDefault: "dev-insecure-secret-change-me-please-32+",
  },
  {
    key: "BASE_DOMAINS",
    required: false,
    description: "Comma-separated list of allowed base domains for tenant resolution (e.g. optimora.ai,acme.app).",
    profiles: ["platform", "all"],
    sensitive: false,
  },
  {
    key: "PORT",
    required: false,
    description: "Platform API listen port. Defaults to 3000.",
    profiles: ["platform", "all"],
    sensitive: false,
  },
  {
    key: "NODE_ENV",
    required: false,
    description: "Node environment. Set to 'production' in prod to enable secure cookies and hardened settings.",
    profiles: ["platform", "web", "all"],
    sensitive: false,
  },

  // ── Database ──────────────────────────────────────────────────────────────────
  {
    key: "DATABASE_URL",
    required: true,
    description: "Postgres connection URL (Prisma). Used by the platform and db package.",
    profiles: ["platform", "all"],
    sensitive: true,
  },
  {
    key: "DIRECT_DATABASE_URL",
    required: false,
    description: "Direct (non-pooled) Postgres URL for migrations. Required when using a connection pooler (e.g. PgBouncer).",
    profiles: ["platform", "all"],
    sensitive: true,
  },

  // ── Redis ─────────────────────────────────────────────────────────────────────
  {
    key: "REDIS_URL",
    required: false,
    description: "Redis connection URL (e.g. redis://localhost:6379). Used for rate limiting, session caching, and pub/sub.",
    profiles: ["platform", "all"],
    sensitive: true,
  },

  // ── Temporal ──────────────────────────────────────────────────────────────────
  {
    key: "TEMPORAL_ADDRESS",
    required: false,
    description: "Temporal frontend address (host:port, e.g. localhost:7233). Defaults to localhost:7233.",
    profiles: ["platform", "all"],
    sensitive: false,
  },
  {
    key: "TEMPORAL_NAMESPACE",
    required: false,
    description: "Temporal namespace. Defaults to 'default'.",
    profiles: ["platform", "all"],
    sensitive: false,
  },
  {
    key: "TEMPORAL_TASK_QUEUE_BASE",
    required: false,
    description: "Base name for Temporal task queues. Defaults to 'optimora'.",
    profiles: ["platform", "all"],
    sensitive: false,
  },

  // ── Qdrant ────────────────────────────────────────────────────────────────────
  {
    key: "QDRANT_URL",
    required: false,
    description: "Qdrant vector DB URL (e.g. http://localhost:6333). Used for semantic memory.",
    profiles: ["platform", "all"],
    sensitive: false,
  },
  {
    key: "QDRANT_API_KEY",
    required: false,
    description: "Qdrant API key (required in production Qdrant Cloud deployments).",
    profiles: ["platform", "all"],
    sensitive: true,
  },

  // ── ClickHouse ────────────────────────────────────────────────────────────────
  {
    key: "CLICKHOUSE_URL",
    required: false,
    description: "ClickHouse HTTP endpoint (e.g. http://localhost:8123). Used for OLAP/analytics.",
    profiles: ["platform", "all"],
    sensitive: false,
  },
  {
    key: "CLICKHOUSE_USER",
    required: false,
    description: "ClickHouse username. Defaults to 'optimora'.",
    profiles: ["platform", "all"],
    sensitive: false,
  },
  {
    key: "CLICKHOUSE_PASSWORD",
    required: false,
    description: "ClickHouse password.",
    profiles: ["platform", "all"],
    sensitive: true,
  },
  {
    key: "CLICKHOUSE_DATABASE",
    required: false,
    description: "ClickHouse database name. Defaults to 'optimora_olap'.",
    profiles: ["platform", "all"],
    sensitive: false,
  },

  // ── Demo / seed ───────────────────────────────────────────────────────────────
  {
    key: "DEMO_API_KEY",
    required: false,
    description: "API key for seed-demo.ts (must start with opt_). Only used during seeding.",
    profiles: ["demo", "all"],
    sensitive: true,
  },
  {
    key: "DEMO_TENANT_ID",
    required: false,
    description: "Demo tenant UUID. Defaults to a safe hardcoded demo UUID.",
    profiles: ["demo", "all"],
    sensitive: false,
  },
  {
    key: "DEMO_ORG_ID",
    required: false,
    description: "Demo org UUID. Defaults to a safe hardcoded demo UUID.",
    profiles: ["demo", "all"],
    sensitive: false,
  },
];

function present(key: string): boolean {
  return Boolean(process.env[key]);
}

function getValue(key: string): string | undefined {
  return process.env[key];
}

function main() {
  const filtered = profile === "all"
    ? ENV_VARS
    : ENV_VARS.filter((v) => v.profiles.includes(profile));

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║   Optimora env check — profile: ${profile.padEnd(20)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);

  let missing = 0;
  let warnings = 0;

  for (const v of filtered) {
    const ok = present(v.key);
    const val = getValue(v.key);
    const isInsecure = v.insecureDefault && val === v.insecureDefault;

    let status: string;
    if (ok && isInsecure) {
      status = "⚠ INSECURE DEFAULT";
      warnings++;
    } else if (ok) {
      status = v.sensitive ? "✓ set (hidden)" : `✓ ${val}`;
    } else if (v.required) {
      status = "✗ MISSING (required)";
      missing++;
    } else {
      status = "○ not set (optional — using default)";
    }

    const marker = v.required ? "[required]" : "[optional]";
    console.log(`${marker.padEnd(11)} ${v.key}`);
    console.log(`           ${status}`);
    console.log(`           ${v.description}\n`);
  }

  console.log("──────────────────────────────────────────────────────");
  if (missing === 0 && warnings === 0) {
    console.log("✓ All required vars present. No insecure defaults detected.");
  } else {
    if (missing > 0) console.log(`✗ ${missing} required variable(s) missing.`);
    if (warnings > 0) console.log(`⚠ ${warnings} insecure default(s) detected — change before production.`);
  }
  console.log("");

  if (missing > 0) process.exit(1);
}

main();
