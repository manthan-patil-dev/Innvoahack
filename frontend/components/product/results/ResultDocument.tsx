import type { DocumentOutput, ImportanceLevel } from "@/lib/types/agents";
import { Block, DashList, ResultFrame } from "@/components/product/results/ResultFrame";

function importanceVariant(level: ImportanceLevel): "neutral" | "gold" | "danger" {
  if (level === "CRITICAL") return "danger";
  if (level === "HIGH") return "gold";
  return "neutral";
}

export function ResultDocument({ output }: { output: DocumentOutput }) {
  const entries = Object.entries(output.key_information);

  return (
    <ResultFrame
      agent="DocumentAgent"
      title={output.document_type}
      badge={{ label: output.importance_level, variant: importanceVariant(output.importance_level) }}
    >
      <p className="max-w-prose text-body text-ink">{output.summary}</p>

      {entries.length > 0 ? (
        <Block label="Extracted">
          <dl className="divide-y border-y">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-6 py-2.5">
                <dt className="text-ui text-ink-muted">{key}</dt>
                <dd className="text-right text-ui tnum text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Block>
      ) : null}

      {output.action_items.length > 0 ? (
        <Block label="Action items">
          <DashList items={output.action_items} />
        </Block>
      ) : null}

      {output.expiry_dates.length > 0 ? (
        <Block label="Dates to watch">
          <ul className="flex flex-wrap gap-2">
            {output.expiry_dates.map((date) => (
              <li
                key={date}
                className="rounded-sm border border-gold-line bg-gold-soft px-2.5 py-1 text-meta tnum text-ink"
              >
                {date}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </ResultFrame>
  );
}
