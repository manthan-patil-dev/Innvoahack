import type { RiskLevel, SecurityOutput } from "@/lib/types/agents";
import { Block, ResultFrame } from "@/components/product/results/ResultFrame";
import { AlertBanner } from "@/components/states/AlertBanner";

/** Never false-reassure: MEDIUM and above reads as a warning, not a note. */
function riskVariant(level: RiskLevel): "success" | "gold" | "danger" {
  if (level === "SAFE" || level === "LOW") return "success";
  if (level === "MEDIUM") return "gold";
  return "danger";
}

export function ResultSecurity({ output }: { output: SecurityOutput }) {
  const variant = riskVariant(output.risk_level);
  const dangerous = variant === "danger";

  return (
    <ResultFrame
      agent="SecurityAgent"
      title={output.threat_type}
      badge={{ label: output.risk_level, variant }}
    >
      <div className="flex items-end gap-6">
        <div>
          <p className={dangerous ? "font-display text-numeric-lg tnum text-danger" : "font-display text-numeric-lg tnum"}>
            {output.risk_score}
          </p>
          <p className="mt-1 text-meta text-ink-subtle">Risk score, out of 100</p>
        </div>
        <p className="mb-1 text-meta uppercase tracking-[0.18em] text-ink-muted">
          {output.input_type}
        </p>
      </div>

      <Block label="Why">
        <p className="max-w-prose text-body text-ink">{output.explanation}</p>
      </Block>

      <Block label="Red flags">
        <ul className="space-y-2">
          {output.red_flags.map((flag, i) => (
            <li key={i} className="flex gap-2.5 text-ui text-ink">
              <span
                className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${dangerous ? "bg-danger" : "bg-ink-subtle"}`}
                aria-hidden
              />
              {flag}
            </li>
          ))}
        </ul>
      </Block>

      <AlertBanner tone={dangerous ? "danger" : "info"} title="Recommendation">
        {output.recommendation}
      </AlertBanner>

      {output.safe_alternative ? (
        <Block label="Verified address">
          <p className="break-all rounded-sm border bg-surface-sunken px-3.5 py-2.5 text-ui text-ink">
            {output.safe_alternative}
          </p>
          <p className="mt-2 text-meta text-ink-subtle">
            Reach this by typing it into the address bar, not by following a link.
          </p>
        </Block>
      ) : null}
    </ResultFrame>
  );
}
