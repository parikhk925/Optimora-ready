import { NextRequest, NextResponse } from "next/server";
import { deployPack, listIndustryPacks } from "@/lib/automation-data";
import { getAutomationContextFromSession, requireSession } from "@/lib/session";

export async function GET() {
  const packs = await listIndustryPacks();
  return NextResponse.json({ packs });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as { packKey?: string };
  if (!body.packKey) return NextResponse.json({ error: "packKey required" }, { status: 400 });

  const result = await deployPack(getAutomationContextFromSession(session), body.packKey);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
