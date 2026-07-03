/**
 * @optimora/agent-contract — the stable, versioned Agent Contract (ABI) (T-4.1).
 * Pure contract + validation: no runtime, no AI calls, no task execution.
 */
export const PACKAGE_NAME = "@optimora/agent-contract" as const;

export {
  LIFECYCLE_STATES,
  type LifecycleState,
  isLifecycleState,
  allowedTransitions,
  canTransition,
  applyTransition,
  InvalidLifecycleTransitionError,
} from "./lifecycle.js";

export {
  AgentDefinitionSchema,
  PerformanceSchema,
  AgentSchema,
  parseAgentDefinition,
  safeParseAgentDefinition,
  InvalidAgentContractError,
  type AgentDefinition,
  type AgentDefinitionInput,
  type Performance,
  type Agent,
} from "./schema.js";

export {
  createDefinition,
  nextVersion,
  computeDefinitionHash,
  verifyDefinitionHash,
  assertDefinitionIntegrity,
  ImmutabilityError,
  type NewDefinitionInput,
} from "./versioning.js";

export {
  validateInput,
  validateOutput,
  assertValidIoSchemas,
  type ValidationResult,
} from "./io-schema.js";

export { isBackwardCompatible, type CompatibilityResult } from "./compat.js";
