import { NextRequest, NextResponse } from "next/server";
import { listActivityLogs } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);

  const logs = await listActivityLogs(ctx, limit);
  return NextResponse.json({ logs });
}
