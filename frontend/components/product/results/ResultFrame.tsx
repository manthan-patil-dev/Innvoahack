import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Shared chrome so all four specialist outputs read as one system. */
export function ResultFrame({
  agent,
  title,
  badge,
  children,
  className,
}: {
  agent: string;
  title: string;
  badge?: { label: string; variant?: "neutral" | "gold" | "success" | "danger" | "outline" };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{agent}</p>
          <h3 className="font-display text-h1 leading-tight">{title}</h3>
        </div>
        {badge ? (
          <Badge variant={badge.variant ?? "neutral"} className="mt-1 shrink-0">
            {badge.label}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-7 px-6 py-6">{children}</div>
    </Card>
  );
}

/** Small titled block used inside every result card. */
export function Block({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <p className="eyebrow mb-3">{label}</p>
      {children}
    </section>
  );
}

/** Hairline-bulleted list — matches the gold dash used in the report prose. */
export function DashList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, i) => (
        <li key={i} className="relative pl-4 text-ui text-ink">
          <span className="absolute left-0 top-[0.62em] h-px w-2 bg-gold" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}
