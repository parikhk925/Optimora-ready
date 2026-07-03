/**
 * POST /api/auth/magic-link/verify
 * Proxies to platform /v1/auth/magic-link/verify.
 * On success: stores accessToken in httpOnly cookie, returns { user }.
 * The refresh cookie is forwarded from the platform response via Set-Cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAccessCookie, getDevSession } from "@/lib/session";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

export async function POST(req: NextRequest) {
  if (!BASE) {
    // Local dev only - issue a stub session immediately.
    if (isLocalDevStubEnabled()) {
      const dev = getDevSession();
      await setAccessCookie(dev.accessToken);
      return NextResponse.json({ user: dev.user, dev: true });
    }
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  try {
    const body = (await req.json()) as { token?: string };
    const upstream = await fetch(`${BASE}/v1/auth/magic-link/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-optimora-tenant": TENANT_ID,
      },
      body: JSON.stringify({ token: body.token }),
    });
    if (!upstream.ok) {
      const err = await upstream.json();
      return NextResponse.json(err, { status: upstream.status });
    }
    const data = (await upstream.json()) as {
      accessToken: string;
      user: { id: string; email: string };
    };

    // Store access token server-side; forward Set-Cookie (refresh) from upstream
    await setAccessCookie(data.accessToken);
    const res = NextResponse.json({ user: data.user });

    // Forward the refresh cookie from the platform
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);

    return res;
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
