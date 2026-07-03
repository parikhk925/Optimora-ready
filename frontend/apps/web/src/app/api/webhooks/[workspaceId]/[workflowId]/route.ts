/**
 * Public inbound webhook trigger. No session required — this is the one
 * intentionally public endpoint in the automation API. Validates that the
 * workspace + deployed workflow exist and match, applies a basic per-workflow
 * rate limit, and starts a real workflow run with triggerType "webhook".
 *
 * Optional signature verification: if the workflow's workspace has a webhook
 * secret configured (WEBHOOK_SIGNING_SECRET env var), requests must include a
 * matching `x-optimora-signature` header (HMAC-SHA256 of the raw body). This
 * is architecture-ready but only enforced when the env var is set, so demo
 * workspaces without a configured secret keep working out of the box.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveWebhookContext, startWorkflowRun, checkUsageLimit } from "@/lib/automation-data";
import { checkRateLimit } from "@/lib/rateLimit";

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) return true; // no secret configured — signature check not enforced in demo mode
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string; workflowId: string }> }) {
  const { workspaceId, workflowId } = await params;

  const rate = checkRateLimit(`webhook:${workspaceId}:${workflowId}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers.get("x-optimora-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const ctx = await resolveWebhookContext(workspaceId, workflowId);
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const usage = await checkUsageLimit(ctx, "workflow_run");
  if (!usage.allowed) return NextResponse.json({ error: usage.reason }, { status: 429 });

  let inputData: Record<string, unknown> = {};
  try {
    inputData = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const result = await startWorkflowRun(ctx, workflowId, inputData, "webhook");
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true, runId: result.id, status: result.status }, { status: 201 });
}
