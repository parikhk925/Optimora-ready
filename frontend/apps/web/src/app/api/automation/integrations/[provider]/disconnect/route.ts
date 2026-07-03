import { NextRequest, NextResponse } from "next/server";
import { disconnectIntegration } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { provider } = await params;
  const ctx = getAutomationContextFromSession(session);
  const result = await disconnectIntegration(ctx, provider);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
