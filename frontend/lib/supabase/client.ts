"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Browser client. Used only for the two things that must happen in the browser:
 * signing in and signing out. Every read and write goes through a server client
 * instead, so the session cookie is the only thing this ever touches.
 *
 * `createBrowserClient` memoises internally, so calling this per component is
 * not a new connection each time.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
