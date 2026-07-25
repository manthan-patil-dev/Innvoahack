import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Every fill carries ink or its own dark tone — never light text on gold. */
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-[3px] font-ui text-meta font-medium tracking-[0.04em] whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface-sunken text-ink-muted",
        gold: "border-gold-line bg-gold-soft text-ink",
        success: "border-transparent bg-success-soft text-success",
        danger: "border-transparent bg-danger-soft text-danger",
        outline: "border-line bg-transparent text-ink-muted",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}

/** Small status dot used inside pills and the pipeline trace. */
export function StatusDot({
  status,
  className,
}: {
  status: "pending" | "running" | "success" | "failed";
  className?: string;
}) {
  const tone = {
    pending: "bg-ink-subtle",
    running: "bg-gold animate-pulse-node",
    success: "bg-success",
    failed: "bg-danger",
  }[status];

  return <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", tone, className)} aria-hidden />;
}
