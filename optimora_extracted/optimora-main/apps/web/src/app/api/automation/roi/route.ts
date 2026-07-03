import { NextResponse } from "next/server";
import { getRoiSummary } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const roi = await getRoiSummary(ctx);
  return NextResponse.json({ roi });
}
