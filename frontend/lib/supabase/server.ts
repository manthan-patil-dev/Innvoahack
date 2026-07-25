import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Server client for Server Components and Route Handlers.
 *
 * Every database read and write in the app goes through this, which means every
 * query runs as the signed-in user and Row Level Security is the thing actually
 * enforcing ownership. There is no service-role key anywhere in this project —
 * nothing needs to bypass RLS, and a key that can is a key that can leak.
 *
 * The `setAll` catch is required, not defensive noise: Server Components cannot
 * mutate cookies. Token refresh is handled in middleware, which can, so a
 * failed write here is expected and harmless.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Component — middleware owns the refresh. */
        }
      },
    },
  });
}

/**
 * The signed-in user, or null.
 *
 * `getUser()` rather than `getSession()` on purpose: getSession reads the cookie
 * and trusts it, while getUser verifies the token against the Supabase auth
 * server. Anything making an authorisation decision has to use the verified one.
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
