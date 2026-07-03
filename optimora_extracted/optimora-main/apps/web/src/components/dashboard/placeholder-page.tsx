import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  className?: string;
}

export function PlaceholderPage({ title, description, icon: Icon, comingSoon = true, className }: PlaceholderPageProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {comingSoon && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Icon className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">Coming soon</p>
          <p className="mt-1 text-xs text-gray-400">This section will be wired to the live API in the next phase.</p>
        </div>
      )}
    </div>
  );
}
