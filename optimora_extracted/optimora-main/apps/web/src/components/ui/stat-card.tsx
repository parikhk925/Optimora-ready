interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  sub?: string;
  trend?: { value: string; up: boolean };
}

export function StatCard({ label, value, icon: Icon, iconBg, iconColor, sub, trend }: StatCardProps) {
  return (
    <div className="op-card p-4 flex items-start gap-3">
      {Icon && (
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg ?? "bg-purple-50"}`}
        >
          <Icon className={`h-5 w-5 ${iconColor ?? "text-[#7C3AED]"}`} strokeWidth={1.75} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-[#6B7280] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[#0F1020] leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        {trend && (
          <div className={`mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${trend.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {trend.up ? "↑" : "↓"} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
