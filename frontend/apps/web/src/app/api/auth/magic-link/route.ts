/**
 * POST /api/auth/magic-link
 * Proxies to platform /v1/auth/magic-link.
 * Accepts { email } - forwards tenant header from env.
 */
import { NextRequest, NextResponse } from "next/server";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

export async function POST(req: NextRequest) {
  if (!BASE) {
    // Local dev only - simulate success without hitting backend.
    if (isLocalDevStubEnabled()) {
      return NextResponse.json({ ok: true, dev: true });
    }
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  try {
    const body = (await req.json()) as { email?: string };
    const upstream = await fetch(`${BASE}/v1/auth/magic-link`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-optimora-tenant": TENANT_ID,
      },
      body: JSON.stringify({ email: body.email }),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
