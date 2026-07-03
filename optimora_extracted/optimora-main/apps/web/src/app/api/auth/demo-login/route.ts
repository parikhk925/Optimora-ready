import { NextResponse } from "next/server";
import { getDemoSession, setDemoAccessCookie } from "@/lib/session";
import { isStagingDemoLoginEnabled } from "@/lib/auth-mode";

export async function POST() {
  if (!isStagingDemoLoginEnabled()) {
    return NextResponse.json({ error: "demo_login_disabled" }, { status: 404 });
  }

  const session = getDemoSession();
  await setDemoAccessCookie();

  return NextResponse.json({
    user: session.user,
    tenantId: session.tenantId,
    orgId: session.orgId,
    demo: true,
  });
}
