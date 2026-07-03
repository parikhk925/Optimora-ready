import { NextRequest, NextResponse } from "next/server";
import { getApprovalDetail } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const ctx = getAutomationContextFromSession(session);
  const approval = await getApprovalDetail(ctx, id);
  if (!approval) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ approval });
}
