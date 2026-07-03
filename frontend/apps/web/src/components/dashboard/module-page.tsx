import { LiveBadge } from "@/components/ui/data-states";

interface ModulePageProps {
  title: string;
  description: string;
  live?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ModulePage({ title, description, live, children, action }: ModulePageProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            {live !== undefined && <LiveBadge live={live} />}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
