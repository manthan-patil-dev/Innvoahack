import type { ResponseOutput } from "@/lib/types/agents";
import { ScoreDial, ScoreRow } from "@/components/product/ScoreDial";
import { SectionLabel } from "@/components/ui/section-label";
import { Badge } from "@/components/ui/badge";

/** Baseline before any run has completed. */
const BASELINE = { finance_score: 68, security_score: 95, life_score: 82 };

const PRIORITY_VARIANT = { HIGH: "gold", MEDIUM: "neutral", LOW: "outline" } as const;

export function SystemPanel({ response }: { response: ResponseOutput | null }) {
  const scores = response?.dashboard_updates ?? BASELINE;
  const reminders = response?.dashboard_updates.reminders ?? [];
  const alerts = response?.priority_alerts.filter((a) => a.level !== "NORMAL") ?? [];

  return (
    <aside className="hidden w-panel shrink-0 border-l xl:block">
      <div className="sticky top-16 space-y-8 px-6 py-7">
        <section>
          <SectionLabel className="mb-5">Life score</SectionLabel>
          <div className="flex justify-center">
            <ScoreDial value={scores.life_score} label="Overall" />
          </div>
          <div className="mt-7 space-y-4">
            <ScoreRow value={scores.finance_score} label="Finance" />
            <ScoreRow value={scores.security_score} label="Security" />
          </div>
        </section>

        {alerts.length > 0 ? (
          <section className="hairline pt-7">
            <SectionLabel className="mb-4">Priorities</SectionLabel>
            <ul className="space-y-3">
              {alerts.map((alert, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${
                      alert.level === "CRITICAL" ? "bg-danger" : "bg-gold"
                    }`}
                    aria-hidden
                  />
                  <span className="text-ui text-ink">{alert.message}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="hairline pt-7">
          <SectionLabel className="mb-4">Reminders</SectionLabel>
          {reminders.length === 0 ? (
            <p className="text-ui text-ink-subtle">
              Nothing scheduled. Reminders appear as agents surface deadlines.
            </p>
          ) : (
            <ul className="space-y-4">
              {reminders.map((reminder) => (
                <li key={reminder.id}>
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <span className="text-ui text-ink">{reminder.title}</span>
                    <Badge variant={PRIORITY_VARIANT[reminder.priority]} className="shrink-0">
                      {reminder.priority}
                    </Badge>
                  </div>
                  <p className="text-meta tnum text-ink-subtle">
                    Due {reminder.due} · {reminder.source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
