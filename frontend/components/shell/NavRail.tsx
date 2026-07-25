"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutGrid } from "lucide-react";
import { LogoLockup, LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/app", label: "Orchestrator", icon: LayoutGrid },
      { href: "/app/history", label: "Memory & Timeline", icon: History },
    ],
  },
];

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r bg-bg md:flex lg:w-rail"
    >
      <div className="flex h-16 items-center px-4 lg:px-5">
        <Link href="/" aria-label="LifeOS AI home">
          <LogoLockup className="hidden lg:inline-flex" markSize={24} />
          <LogoMark size={24} className="text-gold lg:hidden" title="LifeOS AI" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-8 px-3 py-4 lg:px-4">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="eyebrow mb-3 hidden px-2 lg:block">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                // Exact match for /app so it doesn't stay lit on child routes.
                const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-sm px-2 py-2 text-ui transition-colors duration-fast ease-io",
                        "justify-center lg:justify-start",
                        active
                          ? "bg-gold-soft text-ink"
                          : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                      )}
                    >
                      {/* One of the five permitted uses of gold. */}
                      {active ? (
                        <span className="absolute inset-y-1 -left-1 w-0.5 rounded-full bg-gold" aria-hidden />
                      ) : null}
                      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.5} />
                      <span className="hidden lg:inline">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="hidden px-4 pb-5 lg:block">
        <p className="text-meta text-ink-subtle">LifeCore engine · v0.1</p>
      </div>
    </nav>
  );
}
