import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Primary is ink-on-cream, not gold: gold with light text is 2.81:1 and fails
 * AA. Gold appears only as the focus ring (from globals) and the optional
 * `accent` underline.
 */
const button = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm",
    "font-ui font-medium transition-all duration-fast ease-io",
    "disabled:pointer-events-none disabled:opacity-45",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-ink text-ink-inverse hover:opacity-[0.88] active:opacity-80",
        outline: "border bg-surface text-ink hover:border-line-strong hover:bg-surface-sunken",
        ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
        danger: "border border-danger bg-transparent text-danger hover:bg-danger-soft",
        link: "text-ink underline decoration-gold underline-offset-4 hover:decoration-2",
      },
      size: {
        sm: "h-8 px-3 text-ui",
        md: "h-10 px-5 text-ui",
        lg: "h-12 px-7 text-[0.9375rem]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/** The only spinner in the system — a 12px hairline arc. */
function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-[orbit_0.7s_linear_infinite]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(button({ variant, size }), className)}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { button as buttonVariants };
