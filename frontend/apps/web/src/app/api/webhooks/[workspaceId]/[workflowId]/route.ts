/**
 * Public inbound webhook trigger. No session required; this is the intentionally
 * public endpoint in the automation API. It validates the workspace/workflow,
 * applies a basic per-workflow rate limit, and starts a workflow run with
 * triggerType "webhook".
 *
 * Production requests require WEBHOOK_SIGNING_SECRET unless unsigned webhooks
 * are explicitly enabled for staging/demo. Requests must include a matching
 * x-optimora-signature header: HMAC-SHA256 of the raw body as raw hex or
 * sha256=<hex>.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveWebhookContext, startWorkflowRun, checkUsageLimit } from "@/lib/automation-data";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyWebhookSignature } from "@/lib/webhook-signature";

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string; workflowId: string }> }) {
  const { workspaceId, workflowId } = await params;

  const rate = checkRateLimit(`webhook:${workspaceId}:${workflowId}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const rawBody = await req.text();
  const signature = verifyWebhookSignature(rawBody, req.headers.get("x-optimora-signature"));
  if (!signature.ok) {
    const status = signature.reason === "missing_secret" ? 503 : 401;
    return NextResponse.json({ error: signature.reason }, { status });
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
