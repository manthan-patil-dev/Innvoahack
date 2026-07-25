import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { SessionProvider } from "@/lib/auth/session-context";
import { AppShell } from "@/components/shell/AppShell";

/** Reading the session makes the whole workspace request-time rendered, which
 *  is what an authenticated surface should be. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // `middleware.ts` already guards these routes. This is the second lock: if the
  // matcher is ever edited wrongly, the workspace still refuses to render
  // without a verified user rather than leaking behind a broken gate.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");

  const email = user.email ?? "";

  return (
    <SessionProvider
      session={{
        userId: user.id,
        email,
        // With Resend's sandbox sender only one address is deliverable, so the
        // mailer prefills that one when it is configured.
        defaultEmailTo: process.env.RESEND_TO_EMAIL?.trim() || email,
      }}
    >
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
