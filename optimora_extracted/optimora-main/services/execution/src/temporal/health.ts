/**
 * Temporal health check (T-7.1). Connects and queries server system info.
 */
import { Connection } from "@temporalio/client";
import { temporalAddress } from "./connection.js";
import { DEFAULT_NAMESPACE } from "./naming.js";

export interface TemporalHealth {
  healthy: boolean;
  address: string;
  namespace: string;
  serverVersion?: string;
  error?: string;
}

export async function checkTemporalHealth(
  namespace: string = DEFAULT_NAMESPACE,
): Promise<TemporalHealth> {
  const address = temporalAddress();
  let connection: Connection | undefined;
  try {
    connection = await Connection.connect({ address });
    const info = await connection.workflowService.getSystemInfo({});
    return { healthy: true, address, namespace, serverVersion: info.serverVersion };
  } catch (err) {
    return {
      healthy: false,
      address,
      namespace,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await connection?.close().catch(() => {});
  }
}
