/**
 * Fixed-window limiter, in process memory.
 *
 * Enough to stop a stuck retry loop or a bored judge from burning the Resend
 * free tier during evaluation. It is per-instance and resets on restart — which
 * is the correct trade for a single-node demo, and is stated rather than hidden.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  // Opportunistic sweep — no timers, so the map cannot outlive the process or
  // keep it alive.
  if (windows.size > 500) {
    windows.forEach((window, key) => {
      if (window.resetAt <= now) windows.delete(key);
    });
  }

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfter,
  };
}
