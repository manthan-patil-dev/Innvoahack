import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { setActionDone } from "@/lib/supabase/queries";

/**
 * Persist one Action Center tick.
 *
 * The row is addressed by (run_id, client_key) rather than a database uuid, so
 * the checklist works from the ids it already computed and does not have to
 * wait for the run to finish saving before it becomes interactive.
 *
 * No ownership check here on purpose: RLS scopes the update to rows whose run
 * belongs to the caller, so a request naming someone else's run updates nothing.
 */
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "unauthorized", message: "Sign in first." },
      { status: 401 },
    );
  }

  let body: { runId?: unknown; clientKey?: unknown; done?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "Malformed request." },
      { status: 400 },
    );
  }

  const runId = typeof body.runId === "string" ? body.runId : "";
  const clientKey = typeof body.clientKey === "string" ? body.clientKey.slice(0, 200) : "";
  const done = body.done === true;

  if (!runId || !clientKey) {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "runId and clientKey are required." },
      { status: 400 },
    );
  }

  const ok = await setActionDone(runId, clientKey, done);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
