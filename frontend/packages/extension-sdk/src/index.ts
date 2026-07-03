/**
 * @optimora/extension-sdk — workspace package scaffold (T-1.1).
 * Placeholder export so the package is buildable; real implementation arrives in later backlog tasks.
 */
export const PACKAGE_NAME = "@optimora/extension-sdk" as const;

export function packageInfo(): { name: string } {
  return { name: PACKAGE_NAME };
}
