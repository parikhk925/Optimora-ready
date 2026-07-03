/**
 * Deterministic tool runner (T-9.1). Executes a small registry of in-process,
 * side-effect-free stub tools. Real tool execution / integrations are out of
 * scope here (separate EMS tasks). Authorization (is this tool declared on the
 * agent's ABI?) is enforced by the runtime BEFORE the runner is invoked; the
 * runner additionally fails closed on an unknown tool name.
 */
import { UnauthorizedToolError, type ToolCall, type ToolResult, type ToolRunner } from "./types.js";

type ToolFn = (args: Record<string, unknown>) => Record<string, unknown>;

/** Built-in deterministic stub tools. */
export const TOOL_REGISTRY: Record<string, ToolFn> = {
  echo: (args) => ({ echoed: args }),
  noop: () => ({ ok: true }),
};

export class DeterministicToolRunner implements ToolRunner {
  readonly name = "deterministic";

  run(call: ToolCall): ToolResult {
    const fn = TOOL_REGISTRY[call.name];
    if (!fn) {
      throw new UnauthorizedToolError(`Unknown tool: ${call.name}.`);
    }
    return { name: call.name, ok: true, output: fn(call.args) };
  }
}
