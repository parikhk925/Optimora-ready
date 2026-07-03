import { cn } from "@/lib/cn";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, className }: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-gray-200 bg-white", className)}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500", col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 text-gray-700", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
