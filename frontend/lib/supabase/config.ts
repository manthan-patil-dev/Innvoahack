/**
 * One place that knows whether Supabase is set up, and under which key name.
 *
 * Supabase renamed the browser-safe key: older projects and the `@supabase/ssr`
 * docs call it the anon key, newer dashboards issue a publishable key
 * (`sb_publishable_...`). Both are accepted by the same client argument, so both
 * env names are read here and nothing downstream has to care which one exists.
 *
 * Nothing throws on a missing value. A misconfigured deployment should say so on
 * the login screen, not crash the process on import.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

/** Placeholder text from .env.example. Copied-but-not-filled is the common
 *  case, and it must read as "not configured" rather than sending the app off
 *  to resolve a hostname that does not exist. */
function isPlaceholder(value: string): boolean {
  return /YOUR[-_]/i.test(value);
}

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith("http") &&
    !isPlaceholder(SUPABASE_URL) &&
    SUPABASE_KEY.length > 0 &&
    !isPlaceholder(SUPABASE_KEY)
  );
}
