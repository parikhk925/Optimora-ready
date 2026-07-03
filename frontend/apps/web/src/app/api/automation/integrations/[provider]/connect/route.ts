import { NextRequest, NextResponse } from "next/server";
import { connectIntegration } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { provider } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const ctx = getAutomationContextFromSession(session);
  const result = await connectIntegration(ctx, provider, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, status: result.status });
}
