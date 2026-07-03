import { NextRequest, NextResponse } from "next/server";
import { getDeployedWorkflowDetail, updateDeployedWorkflow } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const ctx = getAutomationContextFromSession(session);
  const workflow = await getDeployedWorkflowDetail(ctx, id);
  if (!workflow) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ workflow });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { name?: string };
  const ctx = getAutomationContextFromSession(session);
  const result = await updateDeployedWorkflow(ctx, id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ ok: true });
}
