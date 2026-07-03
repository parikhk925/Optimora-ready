/**
 * Demo workflow routes (T-24.1).
 * Synchronous end-to-end pipeline for the "first agent run" demo:
 *   1. Create a task (draft → ready → scheduled)
 *   2. Execute with the deterministic EchoModelProvider (no paid calls)
 *   3. Return the full RunResult including output
 *
 * These routes are dev/demo surface only — they intentionally bypass Temporal
 * so the pipeline is synchronous and inspectable in the UI without a worker.
 * POST /v1/demo/run
 * GET  /v1/demo/runs/:id  (poll status)
 * GET  /v1/demo/tasks/:id (task view)
 */
import type { FastifyInstance } from "fastify";
import { createTask, getTask, transitionTask } from "@optimora/execution";
import { executeRun } from "@optimora/runtime";
import { safeParseAgentDefinition } from "@optimora/agent-contract";

/** Minimal stub AgentDefinition for the demo — valid against the ABI schema. */
const DEMO_AGENT_DEFINITION = {
  identity: {
    agentId: "00000000-0000-0000-0000-000000000099",
    key: "demo-agent",
    displayName: "Demo Agent (Echo)",
  },
  role: "General-purpose demo assistant",
  orgNodeId: null,
  managerNodeId: null,
  jobDescription: "Processes tasks deterministically for demonstration. Never calls paid models.",
  skills: ["summarisation", "analysis"],
  goals: ["Complete the assigned task accurately"],
  kpis: [],
  memory: { working: true, episodic: false, semantic: false, shared: false },
  knowledge: [],
  permissions: [],
  budget: {},
  tools: [],
  inputSchema: { type: "object", properties: { goal: { type: "string" }, context: { type: "string" } } },
  outputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      nextSteps: { type: "string" },
      confidence: { type: "string" },
    },
  },
  qualityRules: {},
  retryRules: {},
  reflectionRules: {},
  escalationRules: {},
  learningRules: {},
  analytics: {},
  logs: {},
  version: 1,
  contentHash: "demo-v1",
  lifecycle: "active",
};

export function registerDemoRoutes(app: FastifyInstance): void {
  /**
   * POST /v1/demo/run
   * Body: { title, goal?, context? }
   * Creates a task, fast-tracks it to scheduled, and executes with the echo model.
   */
  app.post("/v1/demo/run", async (req, reply) => {
    const ctx = req.tenantContext!;
    if (!ctx.orgId) return reply.code(400).send({ error: "org_required" });

    const body = req.body as Record<string, unknown>;
    if (typeof body?.title !== "string" || !body.title.trim()) {
      return reply.code(400).send({ error: "title_required" });
    }

    const parsed = safeParseAgentDefinition(DEMO_AGENT_DEFINITION);
    if (!parsed.success) {
      return reply.code(500).send({ error: "invalid_demo_agent_definition" });
    }

    const runtimeCtx = {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
    };

    const title = (body.title as string).trim();
    const goal = typeof body.goal === "string" ? body.goal : title;
    const context = typeof body.context === "string" ? body.context : "";

    try {
      const result = await req.runScoped!(async (tx) => {
        // 1. Create task in draft state
        const task = await createTask(tx, {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          title,
          priority: 2,
          inputData: { goal, context },
        });

        // 2. Fast-track: draft → ready → scheduled (demo path, no Scheduler needed)
        await transitionTask(tx, task.id, "ready");
        await transitionTask(tx, task.id, "scheduled");

        // 3. Execute with deterministic echo model (no paid calls)
        const runResult = await executeRun(tx, runtimeCtx, {
          taskId: task.id,
          definition: parsed.data,
          input: { goal, context },
        });

        return { task: { id: task.id, title: task.title }, runResult };
      });

      return reply.code(201).send({
        taskId: result.task.id,
        taskTitle: result.task.title,
        runId: result.runResult.run.id,
        runStatus: result.runResult.run.status,
        taskStatus: result.runResult.taskStatus,
        output: result.runResult.output,
        tokensIn: result.runResult.run.tokensIn,
        tokensOut: result.runResult.run.tokensOut,
        modelProvider: result.runResult.run.modelProvider,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(422).send({ error: "run_failed", message });
    }
  });

  /** GET /v1/demo/tasks/:id — task status poll */
  app.get("/v1/demo/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await req.runScoped!((tx) => getTask(tx, id));
    if (!task) return reply.code(404).send({ error: "task_not_found" });
    return reply.send({ task });
  });
}
