"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBanner } from "@/components/states/AlertBanner";

/**
 * The only way into the workspace.
 *
 * `signInWithPassword` runs in the browser and writes the Supabase session
 * cookie itself; there is no login route handler to keep in sync. The token is
 * httpOnly, so nothing on this page can read back what it just created.
 *
 * `router.refresh()` after success discards the cached unauthenticated tree so
 * the workspace renders with the new session on the very first paint.
 */
export function LoginForm({
  next,
  demo,
}: {
  next: string;
  /** Present only when AUTH_SHOW_DEMO_HINT is on — the judge-facing shortcut. */
  demo?: { email: string; password: string };
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Supabase's own wording is the most useful thing to show: "Invalid
        // login credentials" and "Email not confirmed" are different problems
        // with different fixes, and flattening them helps nobody.
        setError(signInError.message);
        setPending(false);
        return;
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

  return (
    <div className="space-y-4">
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

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
          autoComplete="current-password"
          required
          placeholder="Password"
          aria-label="Password"
          className="h-12"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {demo ? (
        <div className="rounded-sm border border-gold-line bg-gold-soft px-4 py-3">
          <p className="eyebrow mb-1.5">Demo access</p>
          <p className="text-meta leading-relaxed text-ink-muted">
            <span className="text-ink">{demo.email}</span> · password{" "}
            <span className="text-ink">{demo.password}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail(demo.email);
              setPassword(demo.password);
              setError(null);
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
