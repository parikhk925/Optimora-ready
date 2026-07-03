import { Badge } from "./badge";

const STATUS_MAP: Record<string, "success" | "warning" | "error" | "muted" | "default"> = {
  active: "success",
  running: "success",
  completed: "success",
  approved: "success",
  ready: "success",
  connected: "success",
  pending: "warning",
  in_progress: "warning",
  trialing: "warning",
  demo: "warning",
  demo_mode: "warning",
  requires_integration: "warning",
  requires_setup: "warning",
  needs_auth: "warning",
  not_connected: "muted",
  inactive: "muted",
  draft: "muted",
  archived: "muted",
  cancelled: "muted",
  failed: "error",
  rejected: "error",
  suspended: "error",
  expired: "error",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_MAP[status] ?? "default";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}
