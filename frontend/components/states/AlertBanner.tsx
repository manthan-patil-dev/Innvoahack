import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "danger" | "success";

/** Hairline border plus a tinted fill — never a solid block of colour. */
const TONES: Record<Tone, string> = {
  info: "border-line bg-surface-sunken",
  warning: "border-gold-line bg-gold-soft",
  danger: "border-danger bg-danger-soft",
  success: "border-success bg-success-soft",
};

export function AlertBanner({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      // "note" is not a valid ARIA role — only announce genuine alerts.
      role={tone === "danger" ? "alert" : undefined}
      className={cn("rounded-sm border px-4 py-3", TONES[tone], className)}
    >
      {title ? (
        <p className={cn("eyebrow mb-1.5", tone === "danger" && "!text-danger")}>{title}</p>
      ) : null}
      <p className={cn("max-w-prose text-ui", tone === "danger" ? "text-danger" : "text-ink")}>
        {children}
      </p>
    </div>
  );
}
