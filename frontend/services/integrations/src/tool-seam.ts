/**
 * Tool seam (E9 Integrations). Registers connector capabilities as ToolDefinition
 * entries in a @optimora/tools ToolRegistry so agents invoke them through the
 * existing tool-execution seam without any Runtime or Tools layer changes.
 */
import type { ToolRegistry, ToolFn } from "@optimora/tools";
import type { ConnectorRegistry } from "./connector-registry.js";

/**
 * For each available connector in the ConnectorRegistry, register all its
 * capabilities as tools in the ToolRegistry. The ToolFn wraps the connector's
 * stub invoke() — deterministic, no secrets, no network.
 */
export function registerConnectorTools(
  connectorRegistry: ConnectorRegistry,
  toolRegistry: ToolRegistry,
): void {
  for (const connector of connectorRegistry.all()) {
    if (!connector.definition.available) continue;
    for (const cap of connector.capabilities) {
      const capName = cap.toolName.slice(connector.definition.key.length + 1); // strip "key."
      const fn: ToolFn = (args: Record<string, unknown>) => connector.invoke(capName, args, null);
      toolRegistry.register(
        {
          name: cap.toolName,
          description: cap.description,
          requiredCaps: cap.requiredCaps,
          inputSchema: cap.inputSchema,
          outputSchema: cap.outputSchema,
          available: true,
        },
        fn,
      );
    }
  }
}
