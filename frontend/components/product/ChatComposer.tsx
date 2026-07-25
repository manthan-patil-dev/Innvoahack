"use client";

import { useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChatComposer({
  onSubmit,
  disabled,
  placeholder = "Ask LifeOS anything — a trip, your spending, a suspicious link…",
}: {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  function send() {
    if (!value.trim() || disabled) return;
    onSubmit(value);
    setValue("");
  }

  return (
    // The textarea suppresses its own ring, so the wrapper carries it —
    // otherwise the composer has no visible focus indicator at all.
    <div className="rounded-md border bg-surface p-2 shadow-e1 focus-within:[outline:2px_solid_var(--gold)] focus-within:[outline-offset:2px]">
      <Textarea
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        aria-label="Your request"
        className="border-0 bg-transparent hover:border-0 focus-visible:outline-none"
      />
      <div className="flex items-center justify-between gap-3 px-1.5 pb-1">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-meta text-ink-subtle transition-colors duration-fast ease-io hover:text-ink-muted"
        >
          <Paperclip className="h-3.5 w-3.5" strokeWidth={1.5} />
          Attach a document
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden text-meta text-ink-subtle sm:inline">Enter to send</span>
          <Button size="icon" onClick={send} disabled={disabled || !value.trim()} aria-label="Send request">
            <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
