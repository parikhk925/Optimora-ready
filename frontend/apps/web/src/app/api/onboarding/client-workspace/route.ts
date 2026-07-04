import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

export async function POST(req: NextRequest) {
  if (!BASE) {
    if (isLocalDevStubEnabled()) {
      const body = (await req.json()) as Record<string, unknown>;
      return NextResponse.json({
        workspace: { ...body, id: "dev-workspace", status: "pending" },
        dev: true,
      });
    }
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const res = await fetch(`${BASE}/v1/onboarding/client-workspace`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        "x-optimora-tenant": TENANT_ID,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
