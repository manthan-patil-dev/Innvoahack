"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBanner } from "@/components/states/AlertBanner";

/**
 * The only way into the workspace: Supabase Auth, email and password.
 *
 * Both modes live in one form because they are the same two fields and the same
 * submit. Sign-up exists so the demo account can be created without dashboard
 * access — on a project with email confirmation off (the default for this one)
 * it returns a session immediately and lands straight in the workspace.
 *
 * `signInWithPassword` / `signUp` run in the browser and write the session
 * cookie themselves; there is no auth route handler to keep in sync. The token
 * is httpOnly, so nothing on this page can read back what it just created.
 */

type Mode = "signin" | "signup";

/**
 * Supabase's messages are accurate but assume you know the system. These add the
 * next action for the two that actually happen, and pass everything else
 * through unchanged rather than inventing a friendlier lie.
 */
function explain(error: AuthError, mode: Mode): string {
  const code = error.code ?? "";

  if (code === "invalid_credentials") {
    return "No account matches that email and password. If this is your first time here, use “Create one” below.";
  }
  if (code === "email_not_confirmed") {
    return "That account exists but its email is not confirmed. Confirm it from the email Supabase sent, or turn off Authentication → Sign In / Providers → Email → “Confirm email” in your Supabase dashboard.";
  }
  if (code === "user_already_exists" || /already registered/i.test(error.message)) {
    return "That email already has an account. Switch to “Sign in” below.";
  }
  if (code === "weak_password") {
    return `${error.message} Supabase requires at least 6 characters by default.`;
  }
  if (code === "signup_disabled") {
    return "This Supabase project has sign-ups disabled. Enable them, or add the user from Authentication → Users.";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return `${error.message} Wait a minute and try again.`;
  }

  return mode === "signup" ? `Could not create the account: ${error.message}` : error.message;
}

export function LoginForm({
  next,
  demo,
}: {
  next: string;
  /** Present only when AUTH_SHOW_DEMO_HINT is on — the judge-facing shortcut. */
  demo?: { email: string; password: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchTo(nextMode: Mode) {
    setMode(nextMode);
    // Last attempt's outcome describes the other mode; keeping it on screen
    // reads as though the new one already failed.
    setError(null);
    setNotice(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const supabase = createClient();
    const credentials = { email: email.trim(), password };

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
        if (signInError) {
          setError(explain(signInError, mode));
          setPending(false);
          return;
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp(credentials);
        if (signUpError) {
          setError(explain(signUpError, mode));
          setPending(false);
          return;
        }

        // No session means the project requires email confirmation. Say so
        // rather than redirecting into a workspace that will bounce them back.
        if (!data.session) {
          setNotice(
            `Account created for ${credentials.email}. Confirm it from the email Supabase just sent, then sign in.`,
          );
          setMode("signin");
          setPending(false);
          return;
        }
      }

      router.replace(next);
      router.refresh();
      // Deliberately left pending: the button stays busy through the navigation
      // rather than flicking back to idle on a page that is about to unmount.
    } catch {
      setError("Could not reach the authentication service. Check your connection.");
      setPending(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <div className="space-y-4">
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      {notice ? <AlertBanner tone="success">{notice}</AlertBanner> : null}

      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          type="email"
          name="email"
          autoComplete="username"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-12"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          type="password"
          name="password"
          // Tells the password manager which one to offer, and to save a new one.
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 6 : undefined}
          placeholder={isSignUp ? "Password — at least 6 characters" : "Password"}
          aria-label="Password"
          className="h-12"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          {pending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-meta text-ink-subtle">
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <button
          type="button"
          onClick={() => switchTo(isSignUp ? "signin" : "signup")}
          className="text-ink underline decoration-gold underline-offset-4 hover:decoration-2"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </button>
      </p>

      {demo ? (
        <div className="rounded-sm border border-gold-line bg-gold-soft px-4 py-3">
          <p className="eyebrow mb-1.5">Demo access</p>
          <p className="text-meta leading-relaxed text-ink-muted">
            <span className="text-ink">{demo.email}</span> · password{" "}
            <span className="text-ink">{demo.password}</span>
          </p>
          <p className="mt-1.5 text-meta leading-relaxed text-ink-subtle">
            First run? Fill these in, then use <span className="text-ink-muted">Create account</span>{" "}
            — the account does not exist until someone makes it.
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail(demo.email);
              setPassword(demo.password);
              setError(null);
              setNotice(null);
            }}
            className="mt-2 text-meta text-ink underline decoration-gold underline-offset-4 hover:decoration-2"
          >
            Fill these in
          </button>
        </div>
      ) : null}
    </div>
  );
}
