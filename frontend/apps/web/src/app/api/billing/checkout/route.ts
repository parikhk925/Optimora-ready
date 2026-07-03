/**
 * Placeholder checkout route — clearly marked requires_setup. No real Stripe/
 * Razorpay checkout session is created in this pass; wiring a real payment
 * provider is documented in docs/BILLING_AND_USAGE.md.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function POST() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json(
    {
      status: "requires_setup",
      message: "Checkout is not live yet. Connect a Stripe or Razorpay account to enable real billing (see docs/BILLING_AND_USAGE.md).",
    },
    { status: 501 },
  );
}
