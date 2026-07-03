import { NextResponse } from "next/server";
import { listWorkspaceIntegrations } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ctx = getAutomationContextFromSession(session);
  const integrations = await listWorkspaceIntegrations(ctx);
  return NextResponse.json({ integrations });
}
