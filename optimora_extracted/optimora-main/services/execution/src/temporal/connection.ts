/**
 * Temporal connection helpers (T-7.1). Centralizes address/namespace config so
 * the rest of the service never reads env or hardcodes endpoints.
 */
export function temporalAddress(): string {
  return process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
}
