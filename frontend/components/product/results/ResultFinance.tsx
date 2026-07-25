import type { FinanceOutput } from "@/lib/types/agents";
import { BarBreakdown } from "@/components/product/BarBreakdown";
import { Block, DashList, ResultFrame } from "@/components/product/results/ResultFrame";
import { AlertBanner } from "@/components/states/AlertBanner";
import { inr } from "@/lib/utils";

export function ResultFinance({ output }: { output: FinanceOutput }) {
  const topCategory = output.top_categories.reduce(
    (max, c) => (c.amount > max.amount ? c : max),
    output.top_categories[0],
  );

  return (
    <ResultFrame
      agent="FinanceAgent"
      title="Spending analysis"
      badge={{ label: `Score ${output.finance_score}`, variant: "gold" }}
    >
      <div>
        <p className="font-display text-numeric-lg tnum">{inr(output.monthly_total)}</p>
        <p className="mt-3 max-w-prose text-body text-ink-muted">{output.summary}</p>
      </div>

      <Block label="Where it went">
        <BarBreakdown
          items={output.top_categories.map((c) => ({
            label: c.name,
            amount: c.amount,
            percentage: c.percentage,
            highlight: c.name === topCategory?.name,
          }))}
        />
      </Block>

      {output.subscription_leaks.length > 0 ? (
        <Block label="Subscription leaks">
          <DashList items={output.subscription_leaks} />
        </Block>
      ) : null}

      {output.savings_opportunities.length > 0 ? (
        <Block label="Savings opportunities">
          <DashList items={output.savings_opportunities} />
        </Block>
      ) : null}

      <Block label="Recommendations">
        <ol className="space-y-3">
          {output.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-3 text-ui text-ink">
              <span className="mt-px w-4 shrink-0 text-meta tnum text-ink-subtle">{i + 1}</span>
              <span className="max-w-prose">{rec}</span>
            </li>
          ))}
        </ol>
      </Block>

      {output.alerts.map((alert, i) => (
        <AlertBanner key={i} tone="warning">
          {alert}
        </AlertBanner>
      ))}
    </ResultFrame>
  );
}
