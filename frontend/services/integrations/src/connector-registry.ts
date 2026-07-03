/**
 * Connector registry (E9 Integrations). Holds ConnectorDefinitions keyed by
 * connector key. Real connectors (Slack, GitHub, Google, MCP servers) plug in
 * by registering here without touching the executor or tool seam.
 */
import type { Connector, ConnectorDefinition } from "./types.js";

export class ConnectorRegistry {
  private readonly _entries: Map<string, Connector> = new Map();

  register(connector: Connector): void {
    this._entries.set(connector.definition.key, connector);
  }

  get(key: string): Connector | undefined {
    return this._entries.get(key);
  }

  all(): Connector[] {
    return [...this._entries.values()];
  }

  availableDefinitions(): ConnectorDefinition[] {
    return this.all()
      .filter((c) => c.definition.available)
      .map((c) => c.definition);
  }
}
