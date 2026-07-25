import { cn } from "@/lib/utils";

/**
 * The eyebrow. 11px, 0.18em tracking, uppercase.
 * This single style carries roughly 40% of the luxury signal — use it above
 * every landing section and every panel group in the app.
 */
export function SectionLabel({
  children,
  rule,
  className,
}: {
  children: React.ReactNode;
  /** Trails a gold hairline off to the right. */
  rule?: boolean;
  className?: string;
}) {
  return <p className={cn("eyebrow", rule && "eyebrow-rule", className)}>{children}</p>;
}
