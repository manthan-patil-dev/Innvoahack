import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PipelineNode, ResponseOutput, RunState } from "@/lib/types/agents";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertBanner } from "@/components/states/AlertBanner";
import { SectionLabel } from "@/components/ui/section-label";
import { SendReportEmail } from "@/components/product/SendReportEmail";

const ALERT_TONE = {
  CRITICAL: "danger",
  HIGH: "warning",
  NORMAL: "info",
} as const;

const STATUS_VARIANT = {
  SUCCESS: "success",
  RETRY: "gold",
  FAILED: "danger",
} as const;

/** The final synthesis layer — one answer, plus the receipts. */
export function UnifiedReport({
  response,
  nodes = [],
  run,
}: {
  response: ResponseOutput;
  /** Pipeline nodes for the same run. The action log carries no timings or
   *  retry notes of its own — both live here, matched by step number. */
  nodes?: PipelineNode[];
  /** Supplied on the workspace, omitted in the style guide. Sending needs the
   *  whole run — the query, the backend and the collected actions all travel
   *  with the report. */
  run?: RunState;
}) {
  const byStep = new Map(nodes.map((n) => [n.step, n]));
  const retries = response.action_log.filter((e) => e.status === "RETRY").length;

  // Summed, not wall-clock: specialists run concurrently via asyncio.gather,
  // so this figure is deliberately labelled as agent time, never as duration.
  const agentTimeMs = nodes.reduce((total, n) => total + (n.elapsedMs ?? 0), 0);
  const ranInParallel = nodes.filter((n) => n.elapsedMs).length > 1;

  return (
    <Card elevated className="overflow-hidden">
      <div className="border-b px-6 py-5">
        <p className="eyebrow mb-3">ResponseAgent · Unified report</p>
        <h2 className="max-w-prose font-display text-display leading-[1.12]">{response.headline}</h2>
      </div>

      {response.priority_alerts.length > 0 ? (
        <div className="space-y-2.5 border-b px-6 py-5">
          {response.priority_alerts.map((alert, i) => (
            <AlertBanner key={i} tone={ALERT_TONE[alert.level]}>
              {alert.message}
            </AlertBanner>
          ))}
        </div>
      ) : null}

      <div className="px-6 py-6">
        <div className="prose-lifeos max-w-prose">
          <Markdown remarkPlugins={[remarkGfm]}>{response.unified_report}</Markdown>
        </div>
      </div>

      {/* Collapsed by default — available, not in the way. */}
      <details className="group border-t">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 transition-colors duration-fast ease-io hover:bg-surface-sunken">
          <div className="min-w-0">
            <SectionLabel>Activity log</SectionLabel>
            {/* Informative while closed, so the receipts advertise themselves. */}
            <p className="mt-1.5 text-meta tnum text-ink-subtle">
              {response.action_log.length} steps
              {" · "}
              {retries === 0 ? "no retries" : `${retries} ${retries === 1 ? "retry" : "retries"}`}
              {agentTimeMs > 0 ? ` · ${agentTimeMs.toLocaleString()}ms agent time` : ""}
            </p>
          </div>
          <span className="shrink-0 text-meta text-ink-subtle transition-transform duration-fast group-open:rotate-90">
            ›
          </span>
        </summary>

        <div className="overflow-x-auto px-6 pb-5">
          <table className="w-full min-w-[520px] border-collapse text-ui">
            <thead>
              <tr className="border-b text-left">
                <th className="w-8 py-2 pr-3 text-meta font-medium text-ink-subtle">#</th>
                <th className="py-2 pr-3 text-meta font-medium text-ink-subtle">Agent</th>
                <th className="py-2 pr-3 text-meta font-medium text-ink-subtle">Action</th>
                <th className="py-2 pr-3 text-right text-meta font-medium text-ink-subtle">
                  Elapsed
                </th>
                <th className="py-2 text-right text-meta font-medium text-ink-subtle">Status</th>
              </tr>
            </thead>
            <tbody>
              {response.action_log.map((entry) => {
                const node = byStep.get(entry.step);

                return (
                  <tr key={entry.step} className="border-b last:border-0 align-top">
                    <td className="py-2.5 pr-3 tnum text-ink-subtle">{entry.step}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-ink">{entry.agent}</td>
                    <td className="py-2.5 pr-3 text-ink-muted">
                      {entry.action}
                      {/* Why a step retried is recorded on the node, not the log. */}
                      {node?.retried && node.note ? (
                        <span className="mt-1 block border-l border-gold-line pl-2.5 text-meta text-ink-subtle">
                          {node.note}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-right tnum text-ink-subtle">
                      {/* 0ms is real for synchronous steps like the Router. */}
                      {typeof node?.elapsedMs === "number" ? `${node.elapsedMs}ms` : "—"}
                      {node && node.attempts > 1 ? (
                        <span className="block text-meta text-ink-subtle">
                          {node.attempts} attempts
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right">
                      <Badge variant={STATUS_VARIANT[entry.status]}>{entry.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {ranInParallel ? (
            <p className="mt-3.5 max-w-prose text-meta text-ink-subtle">
              Specialists run concurrently, so per-step times do not sum to wall-clock duration.
            </p>
          ) : null}
        </div>
      </details>

      {run ? <SendReportEmail run={run} /> : null}
    </Card>
  );
}
