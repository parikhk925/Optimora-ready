/**
 * Approval unit tests (E9 Approval). No DB, no AI calls.
 * Tests error hierarchy, state constants, reason constants.
 */
import { describe, expect, it } from "vitest";
import {
  APPROVAL_REASONS,
  APPROVAL_STATES,
  ApprovalAlreadyResolvedError,
  ApprovalError,
  ApprovalExpiredError,
  ApprovalNotFoundError,
  InvalidApprovalContextError,
  MalformedApprovalRequestError,
  UnauthorizedApproverError,
} from "./types.js";

describe("ApprovalState / ApprovalReason constants", () => {
  it("APPROVAL_STATES contains all expected states", () => {
    expect(APPROVAL_STATES).toContain("pending");
    expect(APPROVAL_STATES).toContain("approved");
    expect(APPROVAL_STATES).toContain("rejected");
    expect(APPROVAL_STATES).toContain("expired");
    expect(APPROVAL_STATES).toContain("cancelled");
  });

  it("APPROVAL_REASONS contains all expected reasons", () => {
    for (const r of [
      "risky_tool_call", "external_message_send", "high_cost_action",
      "data_export", "connector_action", "policy_required",
    ]) {
      expect(APPROVAL_REASONS).toContain(r);
    }
  });
});

describe("Error hierarchy", () => {
  it("all approval errors extend ApprovalError", () => {
    for (const Cls of [
      InvalidApprovalContextError, ApprovalNotFoundError, ApprovalAlreadyResolvedError,
      ApprovalExpiredError, UnauthorizedApproverError, MalformedApprovalRequestError,
    ]) {
      expect(new Cls("x")).toBeInstanceOf(ApprovalError);
    }
  });
});
