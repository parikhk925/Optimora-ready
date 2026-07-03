"use client";

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerSub?: string;
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({
  segments,
  centerLabel,
  centerSub,
  size = 100,
  strokeWidth = 14,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circumference;
    const gap = circumference - dash;
    const arc = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth={strokeWidth}
          />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="round"
            />
          ))}
        </svg>
        {(centerLabel || centerSub) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerLabel && (
              <p className="text-lg font-bold text-[#0F1020] leading-none">{centerLabel}</p>
            )}
            {centerSub && (
              <p className="text-[10px] text-gray-400 mt-0.5">{centerSub}</p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-[11px] text-[#6B7280]">
              <span className="font-semibold text-[#0F1020]">{seg.value}</span>{" "}
              {seg.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
