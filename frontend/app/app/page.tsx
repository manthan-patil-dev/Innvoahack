"use client";

import type { RunState } from "@/lib/types/agents";
import { useRun } from "@/lib/hooks/useRun";
import { TopBar } from "@/components/shell/TopBar";
import { SystemPanel } from "@/components/product/SystemPanel";
import { ChatComposer } from "@/components/product/ChatComposer";
import { PipelineTrace } from "@/components/product/PipelineTrace";
import { AgentResultCard } from "@/components/product/AgentResultCard";
import { UnifiedReport } from "@/components/product/UnifiedReport";
import { EmptyState } from "@/components/states/EmptyState";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";

function RunView({ run }: { run: RunState }) {
  const settled = run.nodes.filter((n) => n.status === "success").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-fade-rise">
        <SectionLabel className="mb-2.5">Your request</SectionLabel>
        <p className="max-w-prose font-display text-h1 leading-snug">{run.query}</p>
      </div>

      <Card className="animate-fade-rise px-6 py-5">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <SectionLabel>LifeCore orchestration</SectionLabel>
          <span className="text-meta tnum text-ink-subtle">
            {settled} / {run.nodes.length}
          </span>
        </div>
        <PipelineTrace nodes={run.nodes} />
      </Card>

      {run.results.map((result, i) => (
        <div key={`${result.agent}-${i}`} className="animate-fade-rise">
          <AgentResultCard result={result} />
        </div>
      ))}

      {run.response ? (
        <div className="animate-fade-rise">
          <UnifiedReport response={run.response} />
        </div>
      ) : null}
    </div>
  );
}

export default function AppPage() {
  const { run, submit, isRunning } = useRun();

  return (
    <>
      <TopBar
        title="Orchestrator"
        subtitle={run ? `${run.nodes.length}-step run · ${run.status}` : "LifeCore is idle"}
      />

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
