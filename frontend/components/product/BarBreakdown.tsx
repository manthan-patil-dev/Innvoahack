import { cn, inr } from "@/lib/utils";

export interface BarItem {
  label: string;
  amount: number;
  percentage?: number;
  /** At most one item should be highlighted — gold is a scalpel. */
  highlight?: boolean;
}

/**
 * Div-based bars instead of a chart library. Three tones maximum: ink for the
 * series, gold for the single highlighted row, sunken surface for the track.
 */
export function BarBreakdown({
  items,
  className,
  showPercent = true,
}: {
  items: BarItem[];
  className?: string;
  showPercent?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.amount), 1);

  return (
    <ul className={cn("space-y-3.5", className)}>
      {items.map((item) => {
        const width = Math.max((item.amount / max) * 100, 1.5);

        return (
          <li key={item.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-4">
              <span className="text-ui text-ink">{item.label}</span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="text-ui tnum text-ink">{inr(item.amount)}</span>
                {showPercent && item.percentage !== undefined ? (
                  <span className="w-8 text-right text-meta tnum text-ink-subtle">{item.percentage}%</span>
                ) : null}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className={cn("h-full rounded-full", item.highlight ? "bg-gold" : "bg-ink")}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
