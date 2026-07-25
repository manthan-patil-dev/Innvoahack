import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { logEmailDelivery } from "@/lib/supabase/queries";
import { rateLimit } from "@/lib/rateLimit";
import { emailConfig, isEmailAddress, sendEmail } from "@/lib/email/resend";
import { buildReportEmail, type ReportEmailInput } from "@/lib/email/reportEmail";

/**
 * Send one completed run to an inbox.
 *
 * Signed-in only. `middleware.ts` guards pages with a redirect, which is the
 * wrong answer for an API call, so the session is checked here and refused with
 * a JSON 401 instead — an open mailer behind a public URL is exactly the kind
 * of thing that gets a hackathon deploy abused.
 */
export const dynamic = "force-dynamic";

/** Generous for a judge trying it twice, tight enough to protect the free tier. */
const SEND_LIMIT = 5;
const SEND_WINDOW_MS = 10 * 60_000;

/** Caps, so a malformed or hostile payload cannot be used to compose a large
 *  message through our API key. */
const MAX = { query: 500, headline: 300, report: 20_000, alerts: 10, actions: 30, line: 400 };

function str(value: unknown, limit: number): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "unauthorized", message: "Sign in to send a report." },
      { status: 401 },
    );
  }
  const session = { email: user.email ?? "" };

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "Malformed request." },
      { status: 400 },
    );
  }

  // Explicit recipient wins; otherwise RESEND_TO_EMAIL, which is the address a
  // sandbox sender can actually reach; otherwise the signed-in address.
  const to = (
    str(body.to, 200).trim() ||
    process.env.RESEND_TO_EMAIL?.trim() ||
    session.email
  ).toLowerCase();
  if (!isEmailAddress(to)) {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "That does not look like an email address." },
      { status: 400 },
    );
  }

  const headline = str(body.headline, MAX.headline).trim();
  const report = str(body.report, MAX.report).trim();
  if (!headline || !report) {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "There is no completed report to send yet." },
      { status: 400 },
    );
  }

  // Config is checked before the rate limit so a misconfigured deployment
  // reports the real problem instead of eventually reporting "too many sends".
  if (!emailConfig().configured) {
    return NextResponse.json(
      {
        ok: false,
        code: "not_configured",
        message:
          "Email delivery is not configured on this deployment. Add RESEND_API_KEY to the frontend environment and restart.",
      },
      { status: 503 },
    );
  }

  const limit = rateLimit(`email:${session.email}`, SEND_LIMIT, SEND_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        message: `Send limit reached (${SEND_LIMIT} per 10 minutes). Try again in ${limit.retryAfter}s.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const input: ReportEmailInput = {
    query: str(body.query, MAX.query).trim() || "(not recorded)",
    headline,
    report,
    alerts: (Array.isArray(body.alerts) ? body.alerts : []).slice(0, MAX.alerts).map((raw) => {
      const alert = (raw ?? {}) as Record<string, unknown>;
      return {
        level: ["CRITICAL", "HIGH", "NORMAL"].includes(String(alert.level))
          ? String(alert.level)
          : "NORMAL",
        message: str(alert.message, MAX.line),
      };
    }),
    actions: (Array.isArray(body.actions) ? body.actions : []).slice(0, MAX.actions).map((raw) => {
      const action = (raw ?? {}) as Record<string, unknown>;
      return {
        text: str(action.text, MAX.line),
        source: str(action.source, 60),
        due: str(action.due, 60) || undefined,
      };
    }),
    backend: str(body.backend, 60) || "unknown",
    steps: Number.isFinite(body.steps) ? Math.max(0, Math.min(99, Number(body.steps))) : 0,
    retries: Number.isFinite(body.retries) ? Math.max(0, Math.min(99, Number(body.retries))) : 0,
  };

  const { subject, html, text } = buildReportEmail(input);
  const result = await sendEmail({ to, subject, html, text });

  // Audit both outcomes. A refused send is the one worth being able to prove
  // happened, so this is not gated on success.
  const runId = str(body.runId, 40).trim() || null;
  await logEmailDelivery({
    userId: user.id,
    runId,
    toEmail: to,
    subject,
    status: result.ok ? "sent" : "failed",
    providerMessageId: result.ok ? result.id : null,
    errorCode: result.ok ? null : result.code,
    errorMessage: result.ok ? null : result.message,
  });

  if (!result.ok) {
    // 502 for a provider refusal: our request was well-formed, the upstream
    // said no. The provider's own message is passed through unchanged.
    const status = result.code === "not_configured" ? 503 : 502;
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true, id: result.id, to });
}
