import { NextRequest, NextResponse } from "next/server";
import { listWorkflowRuns, startWorkflowRun, checkUsageLimit } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ctx = getAutomationContextFromSession(session);
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
  const runs = await listWorkflowRuns(ctx, limit);
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as { deployedWorkflowId?: string; inputData?: Record<string, unknown> };
  if (!body.deployedWorkflowId) {
    return NextResponse.json({ error: "deployedWorkflowId required" }, { status: 400 });
  }

  const ctx = getAutomationContextFromSession(session);
  const limit = await checkUsageLimit(ctx, "workflow_run");
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 });

  const result = await startWorkflowRun(
    ctx,
    body.deployedWorkflowId,
    body.inputData ?? {},
    "manual",
  );
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
