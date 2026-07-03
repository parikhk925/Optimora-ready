import { NextRequest, NextResponse } from "next/server";
import { listPendingApprovals, reviewApproval } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ctx = getAutomationContextFromSession(session);
  const approvals = await listPendingApprovals(ctx);
  return NextResponse.json({ approvals });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as {
    approvalId: string;
    decision: "approve" | "reject" | "request_changes";
    comment?: string;
  };

  if (!body.approvalId || !body.decision) {
    return NextResponse.json({ error: "approvalId and decision required" }, { status: 400 });
  }

  const ctx = getAutomationContextFromSession(session);
  const result = await reviewApproval(ctx, body.approvalId, body.decision, session.user?.id ?? "unknown", body.comment);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
