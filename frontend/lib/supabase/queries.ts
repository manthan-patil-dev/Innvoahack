/**
 * Every database read and write in the app, in one file.
 *
 * Server-side only. All of it runs through the user's own session, so Row Level
 * Security decides what is visible — no query here filters by user_id by hand,
 * because a filter you forget is a leak and a policy you forget is an empty
 * result. The policies are in supabase/schema.sql.
 */

import type { ChatResponse } from "@/lib/types/agents";
import type { ActionItem } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

/* --- reads ---------------------------------------------------------------- */

export interface RunSummary {
  id: string;
  query: string;
  backend: string;
  status: string;
  headline: string | null;
  created_at: string;
  node_count: number;
  specialist_count: number;
  retried_nodes: number;
  served_from_fixtures: boolean;
}

/** Recent runs for the signed-in user, newest first. */
export async function listRuns(limit = 20): Promise<RunSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("run_overview")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[db] listRuns failed:", error.message);
    return [];
  }
  return (data ?? []) as RunSummary[];
}

export interface MemoryRow {
  id: string;
  kind: string;
  value: string;
  created_at: string;
}

export async function listMemories(): Promise<MemoryRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id, kind, value, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[db] listMemories failed:", error.message);
    return [];
  }
  return (data ?? []) as MemoryRow[];
}

/* --- writes --------------------------------------------------------------- */

/**
 * Store one completed run and everything hanging off it.
 *
 * Best effort by contract: the caller treats a null return as "not saved" and
 * carries on. A database hiccup must never be the reason a run that already
 * succeeded disappears from the screen mid-demo.
 *
 * Children are inserted after the parent because every one of them has a
 * foreign key to `runs.id`. They are batched per table rather than per row —
 * five round trips instead of thirty.
 */
/**
 * Guarantee this user has a profile row before anything references it.
 *
 * Every table hangs off `profiles`, and the row is normally created by the
 * `on_auth_user_created` trigger. An account made before that trigger existed
 * has none, and the only symptom is a foreign key violation buried in a server
 * log while the UI reports success — the run is on screen, it just never saved.
 *
 * Idempotent, so the cost after the first call is one no-op upsert.
 */
async function ensureProfile(userId: string, email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, email, display_name: email.split("@")[0] || null },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (!error) return;

  // A clash on the email rather than the id means a profile row already holds
  // this address under a different id — the fixed-uuid demo profile seeded by
  // the first version of the schema. RLS stops us adopting or deleting a row we
  // do not own, and it should: that is a migration, not something a request
  // handler gets to do quietly.
  if (error.code === "23505" && error.message.includes("profiles_email_key")) {
    console.error(
      `[db] ensureProfile: a profile already exists for ${email} under a different id. ` +
        "This is the seeded demo profile from schema v1. Re-run supabase/schema.sql — " +
        "section 2.10 drops profiles with no matching auth user and backfills the real one.",
    );
    return;
  }

  console.error("[db] ensureProfile failed:", error.message);
}

export async function persistRun(
  userId: string,
  email: string,
  chat: ChatResponse,
  actions: ActionItem[],
): Promise<string | null> {
  const supabase = createClient();

  // Must precede the insert below: runs.user_id references profiles(id).
  await ensureProfile(userId, email);

  const agentTimeMs = chat.nodes.reduce((total, node) => total + (node.elapsedMs ?? 0), 0);
  const retryCount = chat.response.action_log.filter((e) => e.status === "RETRY").length;

  const { data: run, error } = await supabase
    .from("runs")
    .insert({
      user_id: userId,
      session_id: chat.session_id,
      query: chat.query,
      backend: chat.backend,
      status: "complete",
      intent: chat.intent,
      selected_agents: chat.selected_agents,
      headline: chat.response.headline,
      unified_report: chat.response.unified_report,
      priority_alerts: chat.response.priority_alerts,
      dashboard_updates: chat.response.dashboard_updates,
      agent_time_ms: agentTimeMs,
      retry_count: retryCount,
    })
    .select("id")
    .single();

  if (error || !run) {
    console.error("[db] persistRun failed:", error?.message);
    return null;
  }

  const runId = run.id as string;

  // Each of these is independent; one failing should not lose the others, so
  // they settle rather than short-circuit.
  await Promise.allSettled([
    chat.plan.length
      ? supabase.from("plan_steps").insert(
          chat.plan.map((step) => ({
            run_id: runId,
            step: step.step,
            task: step.task,
            agent: step.agent,
            input_key: step.input_key,
          })),
        )
      : Promise.resolve(),

    chat.nodes.length
      ? supabase.from("run_nodes").insert(
          chat.nodes.map((node) => ({
            run_id: runId,
            step: node.step,
            agent: node.agent,
            label: node.label,
            status: node.status,
            elapsed_ms: node.elapsedMs ?? null,
            attempts: node.attempts,
            retried: node.retried ?? false,
            note: node.note ?? null,
          })),
        )
      : Promise.resolve(),

    chat.results.length
      ? supabase.from("agent_results").insert(
          chat.results.map((result) => ({
            run_id: runId,
            agent: result.agent,
            output: result.output,
          })),
        )
      : Promise.resolve(),

    chat.critic.length
      ? supabase.from("critic_verdicts").insert(
          chat.critic.map((verdict) => ({
            run_id: runId,
            agent: verdict.agent,
            valid: verdict.valid,
            issues: verdict.issues,
            retry_needed: verdict.retry_needed,
            corrected_output: verdict.corrected_output ?? null,
          })),
        )
      : Promise.resolve(),

    actions.length
      ? supabase.from("action_items").insert(
          actions.map((action) => ({
            user_id: userId,
            run_id: runId,
            // The id the client already computed, so a tick can be matched back
            // without the browser having to learn the database's uuids.
            client_key: action.id,
            body: action.text,
            source_agent: action.source,
            kind: action.kind,
            priority: action.priority,
            due: action.due ?? null,
          })),
        )
      : Promise.resolve(),
  ]);

  return runId;
}

/** Tick or untick one Action Center row. Matched by the client's own key. */
export async function setActionDone(
  runId: string,
  clientKey: string,
  done: boolean,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("action_items")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("run_id", runId)
    .eq("client_key", clientKey);

  if (error) {
    console.error("[db] setActionDone failed:", error.message);
    return false;
  }
  return true;
}

/** Audit row for a report email. Failures are recorded too — an unverified
 *  sending domain is the failure that actually happens, and it is worth being
 *  able to show that it happened. */
export async function logEmailDelivery(entry: {
  userId: string;
  runId: string | null;
  toEmail: string;
  subject: string;
  status: "sent" | "failed";
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("email_deliveries").insert({
    user_id: entry.userId,
    run_id: entry.runId,
    to_email: entry.toEmail,
    subject: entry.subject,
    provider: "resend",
    provider_message_id: entry.providerMessageId ?? null,
    status: entry.status,
    error_code: entry.errorCode ?? null,
    error_message: entry.errorMessage ?? null,
  });

  if (error) console.error("[db] logEmailDelivery failed:", error.message);
}
