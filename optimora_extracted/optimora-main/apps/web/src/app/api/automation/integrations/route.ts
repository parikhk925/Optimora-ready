import { NextResponse } from "next/server";
import { listWorkspaceIntegrations } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  const ctx = getAutomationContextFromSession(session);
  const integrations = await listWorkspaceIntegrations(ctx);
  return NextResponse.json({ integrations });
}
