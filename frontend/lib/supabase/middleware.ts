import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Refreshes the auth token on every request and reports who is signed in.
 *
 * Middleware is the only place that can both read the request cookies and write
 * refreshed ones onto the response, which is why Supabase's SSR guide puts token
 * refresh here. Skipping it means a session that silently expires after an hour
 * while the cookie still looks present.
 *
 * The response object must be the one returned to the caller — rebuilding it
 * afterwards drops the refreshed cookies and logs the user out on the next
 * navigation.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  const response = NextResponse.next({ request });

  // Not configured is treated as "nobody is signed in": the guard then sends
  // every workspace request to /login, which explains the situation. Failing
  // closed is the only safe reading of a missing auth backend.
  if (!isSupabaseConfigured()) {
    return { response, userId: null };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Verified against the auth server, not just decoded from the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null };
}
