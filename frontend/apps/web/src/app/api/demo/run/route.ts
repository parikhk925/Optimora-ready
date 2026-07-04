import { NextRequest, NextResponse } from "next/server";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";
import { requireSession } from "@/lib/session";

const BASE = process.env.PLATFORM_API_URL ?? "";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "";

export async function POST(req: NextRequest) {
  if (!BASE) {
    if (isLocalDevStubEnabled()) {
      const body = (await req.json()) as { title?: string; goal?: string; context?: string };
      const title = body.title ?? "Demo task";
      const goal = body.goal ?? title;
      return NextResponse.json({
        taskId: "dev-task-0000",
        taskTitle: title,
        runId: "dev-run-0000",
        runStatus: "succeeded",
        taskStatus: "in_review",
        output: {
          summary: `Demo Agent processed: "${goal}". (echo model - no paid calls)`,
          nextSteps: "Review the output and confirm or escalate.",
          confidence: "Deterministic stub - 100%",
        },
        tokensIn: 42,
        tokensOut: 28,
        modelProvider: "echo",
        dev: true,
      });
    }
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const res = await fetch(`${BASE}/v1/demo/run`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        "x-optimora-tenant": TENANT_ID,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
