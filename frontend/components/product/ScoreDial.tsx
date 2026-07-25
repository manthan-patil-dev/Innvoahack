import { cn } from "@/lib/utils";

/**
 * A thin gold arc on a hairline track — not a filled donut.
 * SVG stroke-dasharray, no chart library.
 */
export function ScoreDial({
  value,
  label,
  size = 104,
  className,
}: {
  value: number;
  label: string;
  size?: number;
  className?: string;
}) {
  const stroke = 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${clamped} out of 100`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-[stroke-dasharray] duration-slow ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-numeric-md tnum">
          {clamped}
        </span>
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

/** Compact horizontal variant for the system panel's secondary scores. */
export function ScoreRow({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-ui text-ink-muted">{label}</span>
        <span className="font-display text-ui tnum text-ink">{clamped}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div className="h-full rounded-full bg-gold transition-[width] duration-slow ease-out" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
