import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox } from "lucide-react";

export function LoadingRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, message }: { icon?: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="mb-3 h-8 w-8 text-gray-300" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export function LiveBadge({ live }: { live: boolean }) {
  if (live) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Demo data
    </span>
  );
}
