import { NextRequest, NextResponse } from "next/server";
import { listWorkspaceIntegrations } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { provider } = await params;
  const ctx = getAutomationContextFromSession(session);
  const integrations = await listWorkspaceIntegrations(ctx);
  const integration = integrations.find((i) => i.key === provider);
  if (!integration) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ integration });
}
