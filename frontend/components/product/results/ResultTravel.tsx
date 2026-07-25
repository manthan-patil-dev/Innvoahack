import type { TravelOutput } from "@/lib/types/agents";
import { BarBreakdown } from "@/components/product/BarBreakdown";
import { Block, DashList, ResultFrame } from "@/components/product/results/ResultFrame";
import { AlertBanner } from "@/components/states/AlertBanner";
import { inr } from "@/lib/utils";

const BUDGET_LABELS: Record<string, string> = {
  transport: "Transport",
  hotel: "Accommodation",
  food: "Food",
  activities: "Activities",
  buffer: "Buffer",
};

export function ResultTravel({ output }: { output: TravelOutput }) {
  const budgetItems = Object.entries(output.budget_breakdown).map(([key, amount]) => ({
    label: BUDGET_LABELS[key] ?? key,
    amount,
    percentage: Math.round((amount / output.budget_total) * 100),
    highlight: key === "buffer",
  }));

  return (
    <ResultFrame
      agent="TravelAgent"
      title={output.destination}
      badge={{ label: `Score ${output.travel_score}`, variant: "gold" }}
    >
      <div>
        <p className="font-display text-numeric-lg tnum">{inr(output.budget_total)}</p>
        <p className="mt-2 text-ui text-ink-muted">Total planned spend, within budget.</p>
      </div>

      <Block label="Budget breakdown">
        <BarBreakdown items={budgetItems} />
      </Block>

      <Block label="Itinerary">
        <ol className="space-y-6">
          {output.itinerary.map((day) => (
            <li key={day.day}>
              <div className="mb-2.5 flex items-baseline justify-between gap-4 border-b pb-2">
                <span className="font-display text-h2">Day {day.day}</span>
                <span className="text-ui tnum text-ink-muted">{inr(day.estimated_cost)}</span>
              </div>
              <ul className="space-y-2">
                {day.activities.map((activity, i) => (
                  <li key={i} className="relative pl-4 text-ui text-ink">
                    <span className="absolute left-0 top-[0.62em] h-px w-2 bg-gold" aria-hidden />
                    {activity}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Block>

      <Block label="Packing checklist">
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {output.packing_checklist.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-ui text-ink">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-subtle" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </Block>

      {output.tips.length > 0 ? (
        <Block label="Local knowledge">
          <DashList items={output.tips} />
        </Block>
      ) : null}

      {output.warnings.map((warning, i) => (
        <AlertBanner key={i} tone="warning">
          {warning}
        </AlertBanner>
      ))}
    </ResultFrame>
  );
}
