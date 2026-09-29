import { formatDate } from '../lib/format';

/** Minimal themed bar chart (no chart library): daily series with hover titles. */
export function BarChart({
  data,
  height = 160,
  format = (v) => String(v),
}: {
  data: { label: string; value: number; secondary?: string }[];
  height?: number;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / Math.max(1, data.length);
  return (
    <div>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Chart"
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2="100"
            y1={height * f}
            y2={height * f}
            stroke="hsl(var(--border))"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 4);
          return (
            <rect
              key={d.label}
              x={i * barW + barW * 0.18}
              y={height - h}
              width={barW * 0.64}
              height={Math.max(h, d.value ? 1.5 : 0.6)}
              rx="0.6"
              fill={d.value ? 'hsl(var(--accent))' : 'hsl(var(--muted))'}
            >
              <title>{`${formatDate(d.label)}: ${format(d.value)}${d.secondary ? ` · ${d.secondary}` : ''}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{data[0] && formatDate(data[0].label)}</span>
        <span>{data.at(-1) && formatDate(data.at(-1)!.label)}</span>
      </div>
    </div>
  );
}
