import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ResponseOutput } from "@/lib/types/agents";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertBanner } from "@/components/states/AlertBanner";
import { SectionLabel } from "@/components/ui/section-label";

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
export function UnifiedReport({ response }: { response: ResponseOutput }) {
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
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 transition-colors duration-fast ease-io hover:bg-surface-sunken">
          <SectionLabel>Action log · {response.action_log.length} steps</SectionLabel>
          <span className="text-meta text-ink-subtle transition-transform duration-fast group-open:rotate-90">
            ›
          </span>
        </summary>

        <div className="overflow-x-auto px-6 pb-5">
          <table className="w-full min-w-[440px] border-collapse text-ui">
            <thead>
              <tr className="border-b text-left">
                <th className="w-8 py-2 pr-3 text-meta font-medium text-ink-subtle">#</th>
                <th className="py-2 pr-3 text-meta font-medium text-ink-subtle">Agent</th>
                <th className="py-2 pr-3 text-meta font-medium text-ink-subtle">Action</th>
                <th className="py-2 text-right text-meta font-medium text-ink-subtle">Status</th>
              </tr>
            </thead>
            <tbody>
              {response.action_log.map((entry) => (
                <tr key={entry.step} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 tnum text-ink-subtle">{entry.step}</td>
                  <td className="py-2.5 pr-3 text-ink">{entry.agent}</td>
                  <td className="py-2.5 pr-3 text-ink-muted">{entry.action}</td>
                  <td className="py-2.5 text-right">
                    <Badge variant={STATUS_VARIANT[entry.status]}>{entry.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
