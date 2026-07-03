/**
 * POST /api/auth/refresh
 * Proxies refresh to platform. Refreshes access cookie on success.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAccessCookie, clearAccessCookie } from "@/lib/session";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

export async function POST(req: NextRequest) {
  if (!BASE) {
    if (isLocalDevStubEnabled()) return NextResponse.json({ ok: true, dev: true });
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  const refreshCookie = req.cookies.get("optimora_refresh")?.value;
  if (!refreshCookie) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }
  try {
    const upstream = await fetch(`${BASE}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "x-optimora-tenant": TENANT_ID,
        "content-type": "application/json",
        cookie: `optimora_refresh=${encodeURIComponent(refreshCookie)}`,
      },
    });
    if (!upstream.ok) {
      await clearAccessCookie();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    const data = (await upstream.json()) as { accessToken: string; user: unknown };
    await setAccessCookie(data.accessToken);
    const res = NextResponse.json({ user: data.user });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);
    return res;
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
