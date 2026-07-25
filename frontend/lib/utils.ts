import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our type scale and our color scale both live under `text-*`, and stock
 * tailwind-merge puts unknown `text-*` classes in a single conflict group.
 * That made `text-ui` silently delete `text-ink-inverse` — invisible button
 * labels. Registering both scales explicitly keeps them in separate groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display",
            "h1",
            "h2",
            "eyebrow",
            "body",
            "ui",
            "meta",
            "numeric-lg",
            "numeric-md",
          ],
        },
      ],
      "text-color": [
        {
          text: ["ink", "ink-muted", "ink-subtle", "ink-inverse", "gold", "success", "danger"],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ₹ formatting, no decimals — Indian grouping (1,20,000 not 120,000). */
export function inr(amount: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}
