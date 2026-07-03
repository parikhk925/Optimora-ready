import { NextRequest, NextResponse } from "next/server";
import { startWorkflowRun, checkUsageLimit } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { inputData?: Record<string, unknown> };
  const ctx = getAutomationContextFromSession(session);

  const limit = await checkUsageLimit(ctx, "workflow_run");
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 });

  const result = await startWorkflowRun(ctx, id, body.inputData ?? {}, "manual");
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
