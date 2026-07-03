import { NextRequest, NextResponse } from "next/server";
import { listWorkflowTemplates, deployWorkflow } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET() {
  const workflows = await listWorkflowTemplates();
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as { templateKey: string; packKey?: string; name?: string };
  if (!body.templateKey) {
    return NextResponse.json({ error: "templateKey required" }, { status: 400 });
  }

  const result = await deployWorkflow(getAutomationContextFromSession(session), body);

  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
