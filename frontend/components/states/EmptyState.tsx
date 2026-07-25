"use client";

import { LogoMark } from "@/components/brand/Logo";
import { DEMO_PROMPTS } from "@/lib/mock/agentOutputs";

/**
 * The suggested prompts are the three demo scenarios verbatim — one click is a
 * guaranteed working path, which is the point.
 */
export function EmptyState({ onPick }: { onPick: (query: string) => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center sm:py-24">
      <LogoMark size={52} withStar className="text-gold opacity-40" />

      <h2 className="mt-8 max-w-[18ch] font-display text-display leading-[1.1]">
        What should LifeOS handle today?
      </h2>
      <p className="mt-4 max-w-prose text-body text-ink-muted">
        One request. Nine agents. One answer.
      </p>

      <ul className="stagger mt-10 flex w-full max-w-2xl flex-col gap-2.5">
        {DEMO_PROMPTS.map((prompt, i) => (
          <li key={prompt} style={{ "--i": i } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="w-full rounded-sm border bg-surface px-4 py-3 text-left text-ui text-ink transition-all duration-fast ease-io hover:border-line-strong hover:bg-surface-sunken"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
