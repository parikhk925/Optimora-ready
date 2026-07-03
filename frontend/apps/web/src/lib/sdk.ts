/**
 * SDK client factory — reads from environment variables.
 * NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_API_KEY are set per deployment.
 * Falls back to safe stubs so the UI renders without a live backend.
 */
import { OptomoraClient } from "@optimora/sdk";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export function getSdkClient(): OptomoraClient {
  return new OptomoraClient({ baseUrl: BASE_URL, apiKey: API_KEY });
}

/** Whether the SDK is configured with a live API key. */
export function isSdkConfigured(): boolean {
  return API_KEY.startsWith("opt_");
}
