import Link from "next/link";
import { LogoStacked } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { LoginForm } from "@/components/auth/LoginForm";
import { AlertBanner } from "@/components/states/AlertBanner";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Sign-in is Supabase Auth, email and password. No social buttons: a control
 * that opens nothing is worse than not offering it.
 *
 * DEMO_EMAIL / DEMO_PASSWORD are only a display hint so a judge can get in
 * without being told the credentials out of band. They authenticate nothing on
 * their own — the account has to exist in Supabase Auth, and the password there
 * is the one that matters.
 */
export const dynamic = "force-dynamic";

/** Only same-origin app paths are accepted, so a crafted `?next=https://evil…`
 *  cannot turn the login form into an open redirect. */
function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/app") || next.startsWith("//")) return "/app";
  return next;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const next = safeNextPath(searchParams?.next);
  const configured = isSupabaseConfigured();

  const showHint = (process.env.AUTH_SHOW_DEMO_HINT?.trim().toLowerCase() ?? "true") !== "false";
  const demo =
    showHint && configured
      ? {
          email: (process.env.DEMO_EMAIL?.trim() || "judge@lifeos.ai").toLowerCase(),
          password: process.env.DEMO_PASSWORD?.trim() || "lifeos-demo",
        }
      : undefined;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[380px]">
        <div className="mb-10 flex justify-center">
          <LogoStacked markSize={48} />
        </div>

        {configured ? (
          <>
            <p className="mb-8 text-center text-ui leading-relaxed text-ink-muted">
              Sign in to open the orchestrator workspace.
            </p>

            <LoginForm next={next} demo={demo} />

            <p className="mt-8 text-center text-meta leading-relaxed text-ink-subtle">
              Authentication and storage are Supabase. The session is an httpOnly cookie, refreshed
              on every request.
            </p>
          </>
        ) : (
          // Failing closed and saying why. The alternative — letting people into
          // a workspace whose auth backend is missing — is the worse outcome.
          <AlertBanner tone="warning" title="Supabase is not configured">
            Set <span className="text-ink">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="text-ink">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span> in
            <span className="text-ink"> frontend/.env.local</span>, then restart. Until then the
            workspace stays locked.
          </AlertBanner>
        )}

        <p className="mt-10 text-center text-ui">
          <Link href="/" className="text-ink underline decoration-gold underline-offset-4">
            Back to the overview
          </Link>
        </p>
      </div>
    </main>
  );
}
