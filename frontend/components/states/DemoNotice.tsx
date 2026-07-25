import type { RunState } from "@/lib/types/agents";
import { AlertBanner } from "@/components/states/AlertBanner";

/**
 * Says, at the UI level, when a run was served from fixtures.
 *
 * The mock ResponseAgent already writes a disclosure into its own report, but
 * that lives inside fixture prose — edit the fixture and the disclosure
 * silently disappears. This is keyed on run.backend instead, so the claim
 * holds regardless of what the content says.
 *
 * Two intensities, deliberately:
 *
 *   matched   — the scripted scenarios are coherent answers, so a quiet line
 *               is enough; the health chip already reads "Demo fixtures".
 *   unmatched — the specialist content has nothing to do with the question,
 *               which is actively misleading rather than merely canned. That
 *               earns a real banner.
 */
export function DemoNotice({ run }: { run: RunState }) {
  if (run.backend !== "mock") return null;

  const unmatched = run.intent?.clarification_needed === true;

  if (unmatched) {
    return (
      <AlertBanner tone="warning" title="Outside the scripted demo">
        {run.intent?.clarification_question ??
          "Mock mode has no fixture for this request. The agent output below is canned and is not an answer to what you asked."}
      </AlertBanner>
    );
  }

  return (
    <p className="text-meta text-ink-subtle">
      Served from scripted fixtures — orchestration is real, agent content is canned.
    </p>
  );
}
