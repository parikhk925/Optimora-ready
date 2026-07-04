/**
 * GET /api/auth/session
 * Returns the current session user (safe, no tokens) for client-side use.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // Only return safe fields - never the accessToken
  return NextResponse.json({
    user: session.user,
    tenantId: session.tenantId,
    orgId: session.orgId,
    dev: session.dev,
  });
}
