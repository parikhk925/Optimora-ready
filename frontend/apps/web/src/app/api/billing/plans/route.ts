import { NextResponse } from "next/server";
import { getBillingPlans } from "@/lib/automation-data";
import { requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const plans = await getBillingPlans();
  return NextResponse.json({ plans });
}
