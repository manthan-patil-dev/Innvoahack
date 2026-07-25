import * as React from "react";
import { cn } from "@/lib/utils";

/** Focus treatment comes from the global gold :focus-visible ring. */
const base = [
  "w-full rounded-sm border bg-surface px-3.5 text-ui text-ink",
  "placeholder:text-ink-subtle",
  "transition-colors duration-fast ease-io hover:border-line-strong",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, "h-10", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "resize-none py-2.5 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";
