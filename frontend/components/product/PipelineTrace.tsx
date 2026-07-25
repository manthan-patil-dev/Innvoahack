import type { PipelineNode } from "@/lib/types/agents";
import { Badge, StatusDot } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The proof of orchestration. A vertical hairline with one node per agent,
 * filling in as the run progresses. Retries are shown, not hidden — visible
 * self-correction is a feature.
 */
export function PipelineTrace({ nodes, className }: { nodes: PipelineNode[]; className?: string }) {
  return (
    <ol className={cn("relative", className)}>
      {/* The spine. */}
      <span className="absolute bottom-2 left-[3px] top-2 w-px bg-line" aria-hidden />

      {nodes.map((node) => {
        const settled = node.status === "success" || node.status === "failed";

        return (
          <li
            key={`${node.step}-${node.agent}`}
            className={cn(
              "relative flex gap-4 py-2 pl-6 transition-opacity duration-fast ease-io",
              node.status === "pending" ? "opacity-35" : "opacity-100",
            )}
          >
            <span className="absolute left-0 top-[15px]">
              <StatusDot status={node.status} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-ui font-medium text-ink">{node.agent}</span>

                {node.retried && settled ? (
                  <Badge variant="outline" className="translate-y-px">
                    Retry {node.attempts - 1}
                  </Badge>
                ) : null}

                {settled && node.elapsedMs ? (
                  <span className="text-meta tnum text-ink-subtle">{node.elapsedMs}ms</span>
                ) : null}
              </div>

              <p className="mt-0.5 text-ui text-ink-muted">{node.label}</p>

              {node.retried && settled && node.note ? (
                <p className="mt-1.5 border-l border-gold-line pl-2.5 text-meta text-ink-subtle">
                  {node.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
