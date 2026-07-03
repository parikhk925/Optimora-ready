/**
 * POST /api/auth/logout
 * Clears access cookie and proxies logout to platform (revokes refresh).
 */
import { NextRequest, NextResponse } from "next/server";
import { clearAccessCookie } from "@/lib/session";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

export async function POST(req: NextRequest) {
  await clearAccessCookie();

  if (BASE) {
    const refreshCookie = req.cookies.get("optimora_refresh")?.value;
    try {
      await fetch(`${BASE}/v1/auth/logout`, {
        method: "POST",
        headers: {
          "x-optimora-tenant": TENANT_ID,
          ...(refreshCookie
            ? { cookie: `optimora_refresh=${encodeURIComponent(refreshCookie)}` }
            : {}),
        },
      });
    } catch {
      // Best-effort - local cookie already cleared.
    }
  }

  const res = NextResponse.json({ ok: true });
  // Clear the refresh cookie on the client too
  res.cookies.delete("optimora_refresh");
  return res;
}
