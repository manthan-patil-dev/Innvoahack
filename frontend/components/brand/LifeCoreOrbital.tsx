import { cn } from "@/lib/utils";

/**
 * The LifeCore object — concentric rings with orbiting bodies around a nucleus.
 * Pure SVG plus two CSS rotations. No React Three Fiber, no WebGL, no runtime
 * cost, and nothing that can fail on a judge's laptop mid-demo.
 */

const CENTER = 200;

const RINGS = [
  { r: 188, speed: "animate-orbit-slower", dot: 3.5 },
  { r: 138, speed: "animate-orbit-slow", dot: 4.5 },
  { r: 88, speed: "animate-orbit-slower", dot: 3 },
];

export function LifeCoreOrbital({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={cn("h-full w-full", className)}
      aria-hidden
      focusable="false"
    >
      {RINGS.map((ring, i) => (
        <g key={ring.r}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={ring.r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />
          <g
            className={ring.speed}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          >
            <circle
              cx={CENTER}
              cy={CENTER - ring.r}
              r={ring.dot}
              fill={i === 1 ? "var(--gold)" : "var(--ink-subtle)"}
            />
          </g>
        </g>
      ))}

      {/* Nucleus */}
      <circle cx={CENTER} cy={CENTER} r={30} fill="none" stroke="var(--gold)" strokeWidth={1.25} />
      <circle cx={CENTER} cy={CENTER} r={7} fill="var(--gold)" />
    </svg>
  );
}
