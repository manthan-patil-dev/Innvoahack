import Link from "next/link";
import { History, LayoutGrid } from "lucide-react";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { StatusDot } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/Logo";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-bg/85 px-5 backdrop-blur-md lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {/* The rail is hidden below md, so the shell needs a way home here. */}
        <Link href="/" className="shrink-0 md:hidden" aria-label="LifeOS AI home">
          <LogoMark size={22} className="text-gold" />
        </Link>

        <div className="min-w-0">
          <h1 className="truncate font-display text-h1">{title}</h1>
          {subtitle ? <p className="truncate text-meta text-ink-subtle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <span className="hidden items-center gap-2 sm:inline-flex">
          <StatusDot status="success" />
          <span className="eyebrow">LifeCore online</span>
        </span>

        {/* Mobile-only navigation, since the rail is not rendered. */}
        <nav aria-label="Sections" className="flex items-center gap-1 md:hidden">
          <Link
            href="/app"
            aria-label="Orchestrator"
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-fast ease-io hover:bg-surface-sunken hover:text-ink"
          >
            <LayoutGrid className="h-[17px] w-[17px]" strokeWidth={1.5} />
          </Link>
          <Link
            href="/app/history"
            aria-label="Memory and timeline"
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-fast ease-io hover:bg-surface-sunken hover:text-ink"
          >
            <History className="h-[17px] w-[17px]" strokeWidth={1.5} />
          </Link>
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
