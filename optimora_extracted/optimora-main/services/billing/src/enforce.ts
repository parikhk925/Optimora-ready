/**
 * Enforcement helpers for use in route handlers or service-layer guards.
 * These are thin wrappers around checkEntitlement/checkQuota that throw on denial.
 */
export {
  enforceEntitlement,
  enforceQuota,
  checkEntitlement,
  checkQuota,
} from "./service.js";
