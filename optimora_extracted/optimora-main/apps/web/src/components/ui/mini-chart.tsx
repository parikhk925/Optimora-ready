"use client";

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  filled?: boolean;
}

export function MiniChart({ data, color = "#7C3AED", height = 40, filled = true }: MiniChartProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;
  const h = height;
  const pad = 4;
  const step = (w - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${points[0].x},${h} ${polyline} ${points[points.length - 1].x},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {filled && (
        <polygon
          points={area}
          fill={`url(#fill-${color.replace("#", "")})`}
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={color}
      />
    </svg>
  );
}
