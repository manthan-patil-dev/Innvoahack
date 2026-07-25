import Link from "next/link";
import { LogoStacked } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

/**
 * Auth surface. Supabase Auth is scaffolded but deferred — the backend runs on
 * a seeded demo user, so this posts nowhere yet.
 */
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[380px]">
        <div className="mb-12 flex justify-center">
          <LogoStacked markSize={48} />
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-center gap-3" size="lg">
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
              <path
                fill="currentColor"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
                opacity=".9"
              />
              <path
                fill="currentColor"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.94v2.33A9 9 0 0 0 9 18Z"
                opacity=".7"
              />
              <path
                fill="currentColor"
                d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.94a9 9 0 0 0 0 8.1l3.03-2.33Z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.95l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-4 py-3">
            <span className="h-px flex-1 bg-line" />
            <span className="eyebrow">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-3">
            <Input type="email" placeholder="you@example.com" aria-label="Email address" className="h-12" />
            <Button className="w-full" size="lg">
              Continue with email
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-meta leading-relaxed text-ink-subtle">
          By continuing you agree to the terms and privacy policy.
        </p>

        <p className="mt-10 text-center text-ui">
          <Link href="/app" className="text-ink underline decoration-gold underline-offset-4">
            Skip to the demo workspace
          </Link>
        </p>
      </div>
    </main>
  );
}
