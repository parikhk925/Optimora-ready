/**
 * The Agent Contract (ABI) schema (T-4.1).
 *
 * Strict TypeScript types with runtime validation (Zod). The AgentDefinition is
 * the IMMUTABLE, versioned contract for an AI employee; lifecycle + performance
 * live on the mutable Agent wrapper. This is a pure contract — no runtime, no AI
 * calls, no execution.
 */
import { z } from "zod";
import { LIFECYCLE_STATES } from "./lifecycle.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = z.string().regex(UUID_RE, "must be a UUID");
const slug = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/, "must be a lowercase slug");

/** An arbitrary JSON Schema document (validated structurally by Ajv elsewhere). */
const jsonSchema = z.record(z.string(), z.unknown());

// ---- field groups (the 25 ABI fields) ----

const Identity = z.object({
  agentId: uuid,
  key: slug,
  displayName: z.string().min(1),
});

const Kpi = z.object({
  name: z.string().min(1),
  target: z.number(),
  unit: z.string().optional(),
});

const MemoryConfig = z.object({
  working: z.boolean().default(true),
  episodic: z.boolean().default(true),
  semantic: z.boolean().default(true),
  shared: z.boolean().default(false),
  retentionDays: z.number().int().positive().optional(),
});

const KnowledgeBinding = z.object({
  knowledgeBaseId: uuid,
  mode: z.enum(["read", "read_write"]).default("read"),
});

const ToolBinding = z.object({
  name: z.string().min(1),
  ref: z.string().optional(),
  scopes: z.array(z.string()).default([]),
});

const BudgetBinding = z.object({
  /** Org-graph node whose budget this agent draws from (T-3.2). */
  budgetNodeId: uuid.nullable().default(null),
  hardCap: z.number().nonnegative().optional(),
});

const QualityRules = z.object({
  rubricId: z.string().optional(),
  minScore: z.number().min(0).max(1).default(0.7),
  checks: z.array(z.string()).default([]),
});

const RetryRules = z.object({
  maxAttempts: z.number().int().min(0).max(20).default(3),
  backoff: z.enum(["none", "fixed", "exponential"]).default("exponential"),
  retryOn: z.array(z.string()).default([]),
});

const ReflectionRules = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(["self", "rubric", "judge"]).default("rubric"),
});

const EscalationRules = z.object({
  onRetriesExhausted: z.enum(["escalate", "fail", "human"]).default("escalate"),
  escalateToNodeId: uuid.nullable().default(null),
  humanApprovalRequired: z.boolean().default(false),
});

const LearningRules = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(["off", "exemplars", "prompt_version"]).default("exemplars"),
  evalGated: z.boolean().default(true),
});

const AnalyticsConfig = z.object({
  trackCost: z.boolean().default(true),
  trackLatency: z.boolean().default(true),
  trackQuality: z.boolean().default(true),
});

const LogsMetadata = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  redactFields: z.array(z.string()).default([]),
});

/**
 * Immutable, versioned agent definition (the ABI content). `contentHash` and
 * `previousHash` are filled in by the versioning helpers; do not set by hand.
 */
export const AgentDefinitionSchema = z.object({
  // 1 identity, 2 role, 3 org node, 4 manager, 5 job description
  identity: Identity,
  role: z.string().min(1),
  orgNodeId: uuid.nullable().default(null),
  managerNodeId: uuid.nullable().default(null),
  jobDescription: z.string().default(""),
  // 6 skills, 7 goals, 8 kpis
  skills: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  kpis: z.array(Kpi).default([]),
  // 9 memory, 10 knowledge, 11 permissions, 12 budget, 13 tools
  memory: MemoryConfig.default(() => MemoryConfig.parse({})),
  knowledge: z.array(KnowledgeBinding).default([]),
  permissions: z.array(z.string()).default([]),
  budget: BudgetBinding.default(() => BudgetBinding.parse({})),
  tools: z.array(ToolBinding).default([]),
  // 14 input schema, 15 output schema
  inputSchema: jsonSchema.default({ type: "object" }),
  outputSchema: jsonSchema.default({ type: "object" }),
  // 16 quality, 17 retry, 18 reflection, 19 escalation, 20 learning
  qualityRules: QualityRules.default(() => QualityRules.parse({})),
  retryRules: RetryRules.default(() => RetryRules.parse({})),
  reflectionRules: ReflectionRules.default(() => ReflectionRules.parse({})),
  escalationRules: EscalationRules.default(() => EscalationRules.parse({})),
  learningRules: LearningRules.default(() => LearningRules.parse({})),
  // 21 analytics, 22 logs
  analytics: AnalyticsConfig.default(() => AnalyticsConfig.parse({})),
  logs: LogsMetadata.default(() => LogsMetadata.parse({})),
  // 23 version history (this version's coordinates)
  version: z.number().int().positive(),
  previousHash: z.string().nullable().default(null),
  contentHash: z.string().default(""),
  versionNote: z.string().default(""),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
/** Input shape before defaults/hash are applied (for authoring a v1). */
export type AgentDefinitionInput = z.input<typeof AgentDefinitionSchema>;

// 25 reputation / performance metadata (mutable runtime state).
export const PerformanceSchema = z.object({
  reputation: z.number().min(0).max(1).default(0.5),
  runs: z.number().int().nonnegative().default(0),
  successRate: z.number().min(0).max(1).default(0),
  avgQuality: z.number().min(0).max(1).default(0),
  avgCost: z.number().nonnegative().default(0),
  avgLatencyMs: z.number().nonnegative().default(0),
});
export type Performance = z.infer<typeof PerformanceSchema>;

// 24 lifecycle state + the full mutable Agent record wrapping an immutable def.
export const AgentSchema = z.object({
  definition: AgentDefinitionSchema,
  lifecycle: z.enum(LIFECYCLE_STATES).default("draft"),
  performance: PerformanceSchema.default(() => PerformanceSchema.parse({})),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type Agent = z.infer<typeof AgentSchema>;

export class InvalidAgentContractError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown,
  ) {
    super(message);
    this.name = "InvalidAgentContractError";
  }
}

/** Validate + normalize an agent definition (applies defaults). Throws on invalid. */
export function parseAgentDefinition(data: unknown): AgentDefinition {
  const res = AgentDefinitionSchema.safeParse(data);
  if (!res.success) {
    throw new InvalidAgentContractError("Invalid agent definition", res.error.issues);
  }
  return res.data;
}

export function safeParseAgentDefinition(data: unknown) {
  return AgentDefinitionSchema.safeParse(data);
}
