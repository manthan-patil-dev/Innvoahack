import { TopBar } from "@/components/shell/TopBar";
import { SectionLabel } from "@/components/ui/section-label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { listMemories, listRuns } from "@/lib/supabase/queries";

/**
 * Real history, read from Supabase under the signed-in user's own session.
 *
 * Both lists were seeded constants until the database landed. They are now the
 * user's actual rows — which means an empty state is a real possibility, and is
 * handled rather than papered over with fixtures.
 */
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  preference: "Preference",
  constraint: "Constraint",
  entity: "Entity",
  pattern: "Pattern",
};

function relativeDate(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return then.toLocaleDateString();
}

export default async function HistoryPage() {
  // Independent queries, so they go out together rather than in series.
  const [runs, memories] = await Promise.all([listRuns(), listMemories()]);

  return (
    <>
      <TopBar
        title="Memory & Timeline"
        subtitle={`${runs.length} saved run${runs.length === 1 ? "" : "s"} · ${memories.length} memories`}
      />

      <div className="mx-auto w-full max-w-3xl px-5 py-8 lg:px-8">
        <section className="mb-14">
          <SectionLabel rule className="mb-3">
            Recent runs
          </SectionLabel>

          <p className="mb-6 max-w-prose text-meta text-ink-subtle">
            Every run you execute in the Orchestrator is saved to your account and appears here.
          </p>

          {runs.length === 0 ? (
            <Card className="px-5 py-8 text-center">
              <p className="text-ui text-ink-muted">No runs saved yet.</p>
              <p className="mt-1.5 text-meta text-ink-subtle">
                Run a request in the Orchestrator and it will appear here.
              </p>
            </Card>
          ) : (
            <ol className="space-y-3">
              {runs.map((run) => (
                <li key={run.id}>
                  <Card className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-ui text-ink">{run.query}</p>
                        <p className="mt-1.5 text-meta text-ink-subtle">
                          {run.node_count} steps · {run.specialist_count} specialist
                          {run.specialist_count === 1 ? "" : "s"} ·{" "}
                          {run.retried_nodes === 0
                            ? "no retries"
                            : `${run.retried_nodes} ${run.retried_nodes === 1 ? "retry" : "retries"}`}{" "}
                          · {relativeDate(run.created_at)}
                        </p>
                      </div>

                      {/* The engine that actually served it — "groq+mock" for a
                          partially degraded run — rather than a blanket badge. */}
                      <Badge
                        variant={run.served_from_fixtures ? "gold" : "success"}
                        className="shrink-0"
                      >
                        {run.backend}
                      </Badge>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <SectionLabel rule className="mb-6">
            Long-term memory
          </SectionLabel>

          {memories.length === 0 ? (
            <p className="text-ui text-ink-muted">Nothing remembered yet.</p>
          ) : (
            <dl className="divide-y border-y">
              {memories.map((memory) => (
                <div key={memory.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                  <dt className="eyebrow w-28 shrink-0 pt-0.5">
                    {KIND_LABEL[memory.kind] ?? memory.kind}
                  </dt>
                  <dd className="text-ui text-ink">{memory.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="mt-6 max-w-prose text-meta text-ink-subtle">
            Stored against your account. Writing new memory from a run, and vector recall, are both
            scaffolded but not enabled — these are the facts seeded when the account was created.
          </p>
        </section>
      </div>
    </>
  );
}
