import { NavRail } from "@/components/shell/NavRail";

/**
 * Three-column operating-system surface: rail, canvas, system panel.
 * The panel is composed by each page rather than the shell, so the canvas can
 * own its own scroll context.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-shell">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
