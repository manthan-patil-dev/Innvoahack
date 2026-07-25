import { TopBar } from "@/components/shell/TopBar";
import { SectionLabel } from "@/components/ui/section-label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCENARIOS } from "@/lib/mock/agentOutputs";

/** Timeline of past runs plus the memory LifeCore is carrying forward. */

const MEMORY = [
  { kind: "Preference", value: "Prefers train over flights for trips under 800km." },
  { kind: "Constraint", value: "Monthly dining cap set at ₹8,000." },
  { kind: "Entity", value: "Primary bank is HDFC — flag lookalike domains aggressively." },
  { kind: "Pattern", value: "Salary credits on the 1st; discretionary spending peaks days 2–6." },
];

export default function HistoryPage() {
  return (
    <>
      <TopBar title="Memory & Timeline" subtitle="What LifeCore remembers between sessions" />

      <div className="mx-auto w-full max-w-3xl px-5 py-8 lg:px-8">
        <section className="mb-14">
          <SectionLabel rule className="mb-6">
            Recent runs
          </SectionLabel>

          <ol className="space-y-3">
            {SCENARIOS.map((scenario) => (
              <li key={scenario.id}>
                <Card className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-ui text-ink">{scenario.query}</p>
                      <p className="mt-1.5 text-meta text-ink-subtle">
                        {scenario.nodes.length} steps · {scenario.results.length} specialist
                        {scenario.results.length === 1 ? "" : "s"} ·{" "}
                        {scenario.intent.domains.join(", ")}
                      </p>
                    </div>
                    <Badge variant="success" className="shrink-0">
                      Complete
                    </Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionLabel rule className="mb-6">
            Long-term memory
          </SectionLabel>

          <dl className="divide-y border-y">
            {MEMORY.map((item) => (
              <div key={item.value} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                <dt className="eyebrow w-28 shrink-0 pt-0.5">{item.kind}</dt>
                <dd className="text-ui text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-meta text-ink-subtle">
            Retrieved by recency and kind. Vector recall is scaffolded but not enabled.
          </p>
        </section>
      </div>
    </>
  );
}
