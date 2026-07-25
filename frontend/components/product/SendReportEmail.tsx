"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";
import type { RunState } from "@/lib/types/agents";
import { collectActions } from "@/lib/actions";
import { useSession } from "@/lib/auth/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";

/**
 * Sends the report on screen to an inbox, via Resend.
 *
 * The whole payload is posted to /api/email/report, which is where the API key
 * lives — nothing about the mail provider reaches the browser. Failures are
 * shown with the provider's own wording rather than a generic "something went
 * wrong", because the two failures that actually happen in a demo (no API key,
 * unverified sending domain) are both fixed by reading the message.
 */

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; to: string }
  | { kind: "error"; message: string };

export function SendReportEmail({ run }: { run: RunState }) {
  const session = useSession();
  // RESEND_TO_EMAIL when the deployment sets one — on a sandbox sender it is
  // the only address that will actually be delivered to.
  const [to, setTo] = useState(session?.defaultEmailTo ?? session?.email ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (!run.response) return null;

  const servedFromFixtures = run.backend?.includes("mock") ?? false;

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!run.response) return;

    setStatus({ kind: "sending" });

    try {
      const response = await fetch("/api/email/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          // Links the delivery audit row to the saved run, when there is one.
          runId: run.persistedId,
          query: run.query,
          headline: run.response.headline,
          report: run.response.unified_report,
          alerts: run.response.priority_alerts,
          actions: collectActions(run).map((action) => ({
            text: action.text,
            source: action.source,
            due: action.due,
          })),
          backend: run.backend ?? "unknown",
          steps: run.nodes.length,
          retries: run.response.action_log.filter((entry) => entry.status === "RETRY").length,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { message?: string; to?: string }
        | null;

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: body?.message ?? `The email could not be sent (${response.status}).`,
        });
        return;
      }

      setStatus({ kind: "sent", to: body?.to ?? to.trim() });
    } catch {
      setStatus({
        kind: "error",
        message: "Could not reach the mail service. Check the network and try again.",
      });
    }
  }

  return (
    <div className="border-t px-6 py-5">
      <SectionLabel>Send this report</SectionLabel>

      <form onSubmit={send} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            // A new address means the previous outcome no longer describes it.
            if (status.kind !== "sending") setStatus({ kind: "idle" });
          }}
          placeholder="you@example.com"
          aria-label="Recipient email address"
          className="sm:flex-1"
          disabled={status.kind === "sending"}
        />
        <Button type="submit" variant="outline" loading={status.kind === "sending"} className="sm:w-auto">
          {status.kind === "sending" ? null : <Mail className="h-[15px] w-[15px]" strokeWidth={1.5} />}
          {status.kind === "sending" ? "Sending…" : "Email report"}
        </Button>
      </form>

      {status.kind === "sent" ? (
        <p className="mt-3 flex items-start gap-2 text-meta text-success" role="status">
          <Check className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>Sent to {status.to}. Check the inbox — and the spam folder on a first send.</span>
        </p>
      ) : null}

      {status.kind === "error" ? (
        <p className="mt-3 max-w-prose text-meta text-danger" role="alert">
          {status.message}
        </p>
      ) : null}

      {status.kind === "idle" ? (
        <p className="mt-3 max-w-prose text-meta text-ink-subtle">
          Delivered by Resend from the address configured in{" "}
          <span className="text-ink-muted">RESEND_FROM_EMAIL</span>.
          {servedFromFixtures
            ? " This run used demo fixtures, and the email says so."
            : null}
        </p>
      ) : null}
    </div>
  );
}
