/**
 * Resend transport.
 *
 * Called only from route handlers, so RESEND_API_KEY never crosses to the
 * browser. This talks to the REST endpoint with `fetch` rather than pulling in
 * the `resend` SDK — one HTTP call does not justify a dependency, and it keeps
 * the handler runtime-agnostic.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Resend's shared sandbox sender. It works with no DNS setup at all, but it
 *  will only deliver to the address that owns the Resend account. */
const DEFAULT_FROM = "LifeOS AI <onboarding@resend.dev>";

const TIMEOUT_MS = 15_000;

export type SendFailureCode = "not_configured" | "provider_error" | "network_error";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; code: SendFailureCode; message: string; status?: number };

export function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  return {
    apiKey,
    from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM,
    configured: apiKey.length > 0,
  };
}

/** Good enough to reject typos before spending an API call; the provider is the
 *  real authority on deliverability. */
export function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const { apiKey, from, configured } = emailConfig();

  if (!configured) {
    return {
      ok: false,
      code: "not_configured",
      message:
        "Email delivery is not configured on this deployment. Set RESEND_API_KEY in the frontend environment to enable it.",
    };
  }

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return {
      ok: false,
      code: "network_error",
      message: "Could not reach Resend. Check the network connection and try again.",
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; name?: string }
    | null;

  if (!response.ok) {
    // Resend's own wording is the most useful thing we can show — an unverified
    // sending domain reads as "You can only send testing emails to your own
    // email address", which tells the operator exactly what to fix.
    return {
      ok: false,
      code: "provider_error",
      status: response.status,
      message: body?.message ?? `Resend rejected the request (${response.status}).`,
    };
  }

  if (!body?.id) {
    return {
      ok: false,
      code: "provider_error",
      status: response.status,
      message: "Resend accepted the request but returned no message id.",
    };
  }

  return { ok: true, id: body.id };
}
