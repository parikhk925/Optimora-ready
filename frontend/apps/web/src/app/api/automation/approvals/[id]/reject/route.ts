import { NextRequest, NextResponse } from "next/server";
import { reviewApproval } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { comment?: string };
  const ctx = getAutomationContextFromSession(session);
  const result = await reviewApproval(ctx, id, "reject", session.user?.id ?? "unknown", body.comment);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, runStatus: result.runStatus });
}
