import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

export async function GET() {
  if (!BASE) {
    if (isLocalDevStubEnabled()) {
      return NextResponse.json({ hasAgencyProfile: false, hasClientWorkspace: false, dev: true });
    }
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const res = await fetch(`${BASE}/v1/onboarding/status`, {
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        "x-optimora-tenant": TENANT_ID,
        accept: "application/json",
      },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
