import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { persistRun } from "@/lib/supabase/queries";
import type { ChatResponse } from "@/lib/types/agents";
import type { ActionItem } from "@/lib/actions";

/**
 * Save a completed run.
 *
 * Called after `/api/chat` has already answered, never before — persistence is
 * a side effect of a successful run, not a step in it. If this route fails the
 * user still has their answer on screen; they just do not get it in history.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "unauthorized", message: "Sign in to save runs." },
      { status: 401 },
    );
  }

  let body: { chat?: ChatResponse; actions?: ActionItem[] };
  try {
    body = (await request.json()) as { chat?: ChatResponse; actions?: ActionItem[] };
  } catch {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "Malformed request." },
      { status: 400 },
    );
  }

  const chat = body.chat;
  if (!chat?.session_id || !chat?.query || !chat?.response) {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "Incomplete run payload." },
      { status: 400 },
    );
  }

  const runId = await persistRun(user.id, chat, body.actions ?? []);
  if (!runId) {
    return NextResponse.json(
      { ok: false, code: "write_failed", message: "Could not save this run." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, runId });
}
