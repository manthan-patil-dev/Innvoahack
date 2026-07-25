"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme is unknowable on the server; render a neutral slot until mounted so
  // the markup matches and there is no hydration flash.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Toggle theme"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-sm border text-ink-muted",
        "transition-colors duration-fast ease-io hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-[15px] w-[15px]" strokeWidth={1.5} />
        ) : (
          <Moon className="h-[15px] w-[15px]" strokeWidth={1.5} />
        )
      ) : (
        <span className="h-[15px] w-[15px]" />
      )}
    </button>
  );
}
