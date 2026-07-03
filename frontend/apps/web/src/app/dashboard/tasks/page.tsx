import { fetchTasks } from "@/lib/data";
import { ModulePage } from "@/components/dashboard/module-page";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState, EmptyState } from "@/components/ui/data-states";
import { ListTodo } from "lucide-react";

const PRIORITY_LABEL: Record<number, string> = { 1: "High", 2: "Medium", 3: "Low" };

export default async function TasksPage() {
  const res = await fetchTasks();

  return (
    <ModulePage
      title="Tasks"
      description="Agent task queue across your organisation."
      live={res.status === "ok" ? res.live : undefined}
    >
      {res.status === "error" ? (
        <ErrorState message={res.message} />
      ) : res.data.length === 0 ? (
        <EmptyState icon={ListTodo} message="No tasks found." />
      ) : (
        <DataTable
          columns={[
            { key: "title", header: "Title", render: (r) => <span className="font-medium text-gray-900">{r.title}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "priority", header: "Priority", render: (r) => PRIORITY_LABEL[r.priority] ?? r.priority },
            { key: "created", header: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
          ]}
          rows={res.data}
          rowKey={(r) => r.id}
        />
      )}
    </ModulePage>
  );
}
