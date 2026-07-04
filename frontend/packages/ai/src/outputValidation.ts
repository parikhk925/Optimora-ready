/**
 * Structured output validation for AI agent runs. Every agent output is
 * validated against a per-agent-family Zod schema before being persisted or
 * shown in the dashboard — never trust raw model output.
 */
import { z } from "zod";

export class AgentOutputValidationError extends Error {}

const leadQualificationSchema = z.object({
  leadScore: z.number().min(0).max(100),
  qualified: z.boolean(),
  reasoning: z.string().min(1),
  recommendation: z.string().min(1),
});

const ticketTriageSchema = z.object({
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  urgent: z.boolean(),
  reasoning: z.string().min(1),
});

const businessReportSchema = z.object({
  summary: z.string().min(1),
  highlights: z.array(z.string()),
  metricsReviewed: z.number(),
});

const orderRiskSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]),
  riskScore: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  recommendation: z.string().min(1),
});

const clientUpdateSchema = z.object({
  updateText: z.string().min(1),
  highlights: z.array(z.string()),
  tone: z.string().min(1),
});

const resumeScreeningSchema = z.object({
  candidateName: z.string().min(1),
  email: z.string().min(1).nullable().optional(),
  phone: z.string().nullable().optional(),
  skills: z.array(z.string()),
  yearsExperience: z.number().min(0).nullable().optional(),
  summary: z.string().min(1),
  matchScore: z.number().min(0).max(100),
  recommendation: z.enum(["shortlist", "reject", "maybe"]),
});

const offerLetterSchema = z.object({
  subject: z.string().min(1),
  letterBody: z.string().min(1),
});

const genericSchema = z.record(z.string(), z.unknown());

function schemaFor(agentKey: string): z.ZodTypeAny {
  const key = agentKey.toLowerCase();
  if (key.includes("lead") && (key.includes("qualif") || key.includes("score"))) return leadQualificationSchema;
  if (key.includes("ticket") || key.includes("triage") || key.includes("support") || key.includes("classif")) return ticketTriageSchema;
  if ((key.includes("resume") || key.includes("candidate")) && (key.includes("screen") || key.includes("pars"))) return resumeScreeningSchema;
  if (key.includes("offer") && key.includes("letter")) return offerLetterSchema;
  if (key.includes("report") || key.includes("summary") || key.includes("business")) return businessReportSchema;
  if (key.includes("order") || key.includes("risk")) return orderRiskSchema;
  if (key.includes("client") || key.includes("update") || key.includes("agency")) return clientUpdateSchema;
  return genericSchema;
}

/**
 * Validates raw agent output against the schema for its agent family.
 * Throws AgentOutputValidationError on failure — callers must not persist or
 * display unvalidated output.
 */
export function validateAgentOutput(agentKey: string, output: unknown): Record<string, unknown> {
  const schema = schemaFor(agentKey);
  const result = schema.safeParse(output);
  if (!result.success) {
    throw new AgentOutputValidationError(
      `Agent output failed validation for "${agentKey}": ${result.error.message}`,
    );
  }
  return result.data as Record<string, unknown>;
}
