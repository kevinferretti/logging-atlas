// Tiny in-memory fixed-window rate limiter. The app runs as a single container
// (SQLite, one instance), so per-process counters are sufficient; a multi-node
// deploy would need a shared store (Redis) instead. State is lost on restart,
// which only ever forgives clients — it never over-blocks.

interface Window {
  count: number;
  resetAt: number; // epoch ms when the current window ends
}

const buckets = new Map<string, Window>();
// Bound memory: sweep expired windows once the map grows past this.
const SWEEP_THRESHOLD = 5000;

function sweep(now: number): void {
  for (const [key, w] of buckets) {
    if (w.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — send as Retry-After when blocked. */
  retryAfter: number;
}

/**
 * Count one hit against `key`. Allows up to `limit` hits per `windowMs`;
 * further hits in the same window are rejected until it resets.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) sweep(now);

  const w = buckets.get(key);
  if (!w || w.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  w.count += 1;
  if (w.count > limit) {
    return { ok: false, retryAfter: Math.ceil((w.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort client IP for rate-limit keying. Behind the edge proxy the real
 * address is the first hop of X-Forwarded-For; fall back to X-Real-IP, then a
 * shared constant (dev, or a proxy that strips both — everyone shares a bucket,
 * which is safe if coarse).
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "local";
}

/** A 429 JSON response with a Retry-After header. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: "Too many attempts. Please wait and try again." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, retryAfter)),
    },
  });
}
