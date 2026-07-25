import { cn } from "@/lib/utils";

/* ============================================================================
   LifeOS AI — logo system

   Flat vector, single color, driven by `currentColor` so it inverts across
   themes for free. No gradient, no bevel, no shadow — per the brand rules.

   Construction: the "L" foot runs right and cuts through the lower interior of
   the "O", which is what turns two letters into one monogram.
     L  = foundation, leadership, stability
     O  = orbit, operating system, continuity
   ========================================================================== */

/* Weight contrast is what makes this read as a luxury serif rather than a
   geometric tech mark: a 24-unit stem against a 14-unit foot, and a ring with
   vertical stress (thick sides, thin top and bottom) built as an outer circle
   minus a narrower inner ellipse. */

// Centres the 182x134 artwork inside a square 256 box with even padding.
const MARK_TRANSFORM = "translate(-10.29 24.02) scale(1.1429)";

// Outer circle r=62, inner ellipse 45x51 — subtracted via evenodd.
const MARK_O =
  "M88 96a62 62 0 1 0 124 0 62 62 0 1 0-124 0ZM105 96a45 51 0 1 0 90 0 45 51 0 1 0-90 0Z";

// Stem plus foot; the foot runs right and crosses into the O's counter.
const MARK_L = "M30 24h24v107h106v14H30Z";

// Four-point star, seated in the counter well above the foot.
const MARK_STAR = "M150 71q2.8 14.2 17 17-14.2 2.8-17 17-2.8-14.2-17-17 14.2-2.8 17-17Z";

type MarkProps = {
  size?: number;
  /** The star reads as mush below ~24px. Off by default at small sizes. */
  withStar?: boolean;
  className?: string;
  title?: string;
};

export function LogoMark({ size = 28, withStar, className, title }: MarkProps) {
  const showStar = withStar ?? size >= 40;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <g transform={MARK_TRANSFORM} fill="currentColor">
        {/* Separate paths, not one — merging them would let evenodd cancel the
            foot where it overlaps the ring. */}
        <path fillRule="evenodd" d={MARK_O} />
        <path d={MARK_L} />
        {showStar ? <path d={MARK_STAR} /> : null}
      </g>
    </svg>
  );
}

/** Wordmark only. Wide tracking is doing the luxury work here. */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display leading-none tracking-[0.22em] text-ink",
        className,
      )}
    >
      LIFEOS AI
    </span>
  );
}

/**
 * Horizontal lockup — the nav/product default.
 * Mark in gold, wordmark in ink. Gold is never used for the text.
 */
export function LogoLockup({
  className,
  markSize = 26,
  wordClassName,
}: {
  className?: string;
  markSize?: number;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Decorative — the wordmark beside it already carries the name. */}
      <LogoMark size={markSize} className="text-gold" />
      <LogoWordmark className={cn("text-[15px]", wordClassName)} />
    </span>
  );
}

/**
 * Stacked lockup — auth page, landing footer, deck.
 * Tagline sits in --ink-muted, not gold: gold on cream is 2.56:1 and fails AA.
 */
export function LogoStacked({
  className,
  markSize = 56,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center text-center", className)}>
      <LogoMark size={markSize} withStar className="text-gold" />
      <LogoWordmark className="mt-5 text-[19px]" />
      <span className="mt-4 flex w-full items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-gold opacity-45" />
        <svg width="7" height="7" viewBox="0 0 64 64" className="text-gold shrink-0">
          <path d="M 32 6 Q 34 30 58 32 Q 34 34 32 58 Q 30 34 6 32 Q 30 30 32 6 Z" fill="currentColor" />
        </svg>
        <span className="h-px flex-1 bg-gold opacity-45" />
      </span>
      <span className="eyebrow mt-4 max-w-[24ch] !leading-[1.7]">
        The AI Operating System For Your Entire Digital Life.
      </span>
    </span>
  );
}
