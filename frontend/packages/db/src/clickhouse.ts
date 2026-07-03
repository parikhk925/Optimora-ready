/**
 * ClickHouse client (T-1.5) for the OLAP plane (run_steps, usage_events, audit).
 * Org isolation is by validated org_id scoping on shared, partitioned tables
 * (see clickhouseOrgScope in namespacing.ts).
 */
import { createClient, type ClickHouseClient } from "@clickhouse/client";

export type { ClickHouseClient } from "@clickhouse/client";

export interface ClickHouseConfig {
  url?: string;
  username?: string;
  password?: string;
  database?: string;
}

let singleton: ClickHouseClient | undefined;

function build(config: ClickHouseConfig): ClickHouseClient {
  return createClient({
    url: config.url ?? process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    username: config.username ?? process.env.CLICKHOUSE_USER ?? "optimora",
    password: config.password ?? process.env.CLICKHOUSE_PASSWORD ?? "",
    database: config.database ?? process.env.CLICKHOUSE_DATABASE ?? "optimora_olap",
  });
}

/** Lazily-created ClickHouse client (reads CLICKHOUSE_* env by default). */
export function getClickhouse(config: ClickHouseConfig = {}): ClickHouseClient {
  if (config.url || config.username || config.password || config.database) {
    return build(config);
  }
  singleton ??= build({});
  return singleton;
}
