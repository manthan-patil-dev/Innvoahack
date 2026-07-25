"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSession } from "@/lib/auth/session-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Who is signed in, and the way out.
 *
 * Signing out clears the Supabase session in the browser, then `router.refresh()`
 * makes the server re-render with no session and drops the cached workspace
 * tree — so a back-button press after signing out lands on /login, not on a
 * stale copy of the workspace.
 */
export function AccountMenu() {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!session) return null;

  const initial = session.email.trim().charAt(0).toUpperCase() || "?";

  async function signOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // The cookie may not have been cleared, but the redirect below still
      // sends them to /login, where the middleware will re-decide.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Signed in as ${session.email}. Open account menu.`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-surface text-meta font-medium text-ink-muted transition-colors duration-fast ease-io hover:border-line-strong hover:text-ink"
      >
        {initial}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Account"
          // Matches HealthChip: a viewport sheet below sm, an anchored popover above.
          className="fixed left-4 right-4 top-[4.25rem] z-30 rounded-sm border bg-surface p-4 text-left shadow-e2 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[240px]"
        >
          <p className="eyebrow">Signed in</p>
          <p className="mt-1.5 truncate text-ui text-ink" title={session.email}>
            {session.email}
          </p>
          <p className="mt-3 border-t pt-3 text-meta text-ink-subtle">
            Signed in with Supabase Auth. Runs, actions and memory are stored against this account.
          </p>

          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-center"
            onClick={signOut}
            loading={signingOut}
          >
            {signingOut ? null : <LogOut className="h-[15px] w-[15px]" strokeWidth={1.5} />}
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
}
