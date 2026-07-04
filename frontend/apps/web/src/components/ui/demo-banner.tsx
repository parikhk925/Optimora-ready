import { Info, AlertCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

interface DemoBannerProps {
  businessName?: string;
  message?: string;
  variant?: "info" | "warning" | "demo";
  className?: string;
}

export function DemoBanner({
  businessName = "your workspace",
  message,
  variant = "demo",
  className,
}: DemoBannerProps) {
  const variants = {
    demo: {
      wrapper: "border-amber-200 bg-amber-50",
      icon: "text-amber-600",
      text: "text-amber-800",
      label: "Sample Preview",
      Icon: FlaskConical,
    },
    info: {
      wrapper: "border-blue-200 bg-blue-50",
      icon: "text-blue-600",
      text: "text-blue-800",
      label: "Preview",
      Icon: Info,
    },
    warning: {
      wrapper: "border-orange-200 bg-orange-50",
      icon: "text-orange-600",
      text: "text-orange-800",
      label: "Requires Setup",
      Icon: AlertCircle,
    },
  };

  const v = variants[variant];
  const Icon = v.Icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        v.wrapper,
        className,
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", v.icon)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs", v.text)}>
          <span className="font-semibold">{v.label}:</span>{" "}
          {message ??
            `"${businessName}" hasn't run any real workflows yet — showing sample output. Deploy a pack or connect integrations to see live results.`}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            variant === "demo"
              ? "bg-amber-200 text-amber-800"
              : variant === "info"
                ? "bg-blue-200 text-blue-800"
                : "bg-orange-200 text-orange-800",
          )}
        >
          {v.label}
        </span>
      </div>
    </div>
  );
}

export function IntegrationBadge({ label, status }: { label: string; status: "requires_integration" | "custom_setup" | "available" | "demo" }) {
  const configs = {
    requires_integration: { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Requires Integration" },
    custom_setup: { className: "bg-purple-50 text-purple-700 border-purple-200", label: "Custom Setup Required" },
    available: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Available" },
    demo: { className: "bg-amber-50 text-amber-700 border-amber-200", label: "Sample" },
  };
  const c = configs[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium", c.className)}>
      {label}
      <span className="text-[9px] opacity-70 font-normal">· {c.label}</span>
    </span>
  );
}
