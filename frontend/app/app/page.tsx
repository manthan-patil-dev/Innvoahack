"use client";

import type { RunState } from "@/lib/types/agents";
import { useRun } from "@/lib/hooks/useRun";
import { TopBar } from "@/components/shell/TopBar";
import { SystemPanel } from "@/components/product/SystemPanel";
import { ChatComposer } from "@/components/product/ChatComposer";
import { PipelineTrace } from "@/components/product/PipelineTrace";
import { AgentResultCard } from "@/components/product/AgentResultCard";
import { ValidationNote } from "@/components/product/ValidationNote";
import { UnifiedReport } from "@/components/product/UnifiedReport";
import { ActionCenter } from "@/components/product/ActionCenter";
import { deriveConfidence } from "@/lib/confidence";
import { collectActions } from "@/lib/actions";
import { EmptyState } from "@/components/states/EmptyState";
import { AlertBanner } from "@/components/states/AlertBanner";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Skeleton } from "@/components/ui/skeleton";

/** Awaiting /api/chat. The node list is unknown until LifeCore replies, so we
 *  show weight rather than inventing placeholder steps. */
function DispatchingTrace() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy>
      <span className="sr-only">Dispatching to LifeCore</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4 pl-6">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-full max-w-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RunView({ run }: { run: RunState }) {
  const settled = run.nodes.filter((n) => n.status === "success" || n.status === "failed").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-fade-rise">
        <SectionLabel className="mb-2.5">Your request</SectionLabel>
        <p className="max-w-prose font-display text-h1 leading-snug">{run.query}</p>
      </div>

      {run.status === "error" ? (
        <div className="animate-fade-rise">
          <AlertBanner tone="danger" title="LifeCore unreachable">
            {run.error ?? "The run could not be completed."}
          </AlertBanner>
        </div>
      ) : null}

      {/* A failed dispatch has no trace to show — the banner above says it all. */}
      {run.status === "error" && run.nodes.length === 0 ? null : (
        <Card className="animate-fade-rise px-6 py-5">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <SectionLabel>LifeCore orchestration</SectionLabel>
            <span className="text-meta tnum text-ink-subtle">
              {run.dispatching ? "dispatching…" : `${settled} / ${run.nodes.length}`}
            </span>
          </div>
          {run.dispatching ? <DispatchingTrace /> : <PipelineTrace nodes={run.nodes} />}
        </Card>
      )}

      {run.results.map((result, i) => {
        // Provenance for this specific output: what it was asked, and what the
        // Critic concluded. Matched by agent name rather than index, since the
        // reveal order is node order, not results order.
        const verdict = run.critic?.find((v) => v.agent === result.agent);
        const node = run.nodes.find((n) => n.agent === result.agent);
        const task = run.plan?.find((p) => p.agent === result.agent)?.task;

        return (
          <div key={`${result.agent}-${i}`} className="animate-fade-rise">
            <AgentResultCard result={result} />
            <ValidationNote confidence={deriveConfidence(verdict, node)} task={task} />
          </div>
        );
      })}

      {run.response ? (
        <div className="animate-fade-rise">
          <UnifiedReport response={run.response} />
        </div>
      ) : null}

      {run.response ? (
        <div className="animate-fade-rise">
          {/* Keyed by run so the checklist never carries over between runs. */}
          <ActionCenter key={run.id} items={collectActions(run)} />
        </div>
      ) : null}
    </div>
  );
}

export default function AppPage() {
  const { run, submit, isRunning } = useRun();

  // Naming the serving backend is deliberate: "mock" on screen is how we stay
  // honest about whether a demo ran on fixtures or a live model.
  const subtitle = !run
    ? "LifeCore is idle"
    : run.dispatching
      ? "Dispatching to LifeCore…"
      : `${run.nodes.length}-step run · ${run.status}${run.backend ? ` · ${run.backend}` : ""}`;

  return (
    <>
      <TopBar title="Orchestrator" subtitle={subtitle} />

      <div className="flex flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 px-5 py-6 lg:px-8">
            {run ? <RunView run={run} /> : <EmptyState onPick={submit} />}
          </div>

          <div className="sticky bottom-0 border-t bg-bg/90 px-5 py-4 backdrop-blur-md lg:px-8">
            <div className="mx-auto max-w-3xl">
              <ChatComposer onSubmit={submit} disabled={isRunning} />
            </div>
          </div>
        </div>

        <SystemPanel response={run?.response ?? null} />
      </div>
    </>
  );
}
