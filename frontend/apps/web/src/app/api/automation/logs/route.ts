import { NextRequest, NextResponse } from "next/server";
import { listExecutionLogs } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
  const ctx = getAutomationContextFromSession(session);
  const logs = await listExecutionLogs(ctx, { runId, limit });
  return NextResponse.json({ logs });
}
