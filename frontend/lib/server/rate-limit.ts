/**
 * In-memory sliding-window rate limiter for sensitive API routes.
 *
 * Why in-memory?
 *   The project currently runs on Vercel serverless. Each serverless instance
 *   keeps its own in-process Map, so this is a *best-effort* limiter that stops
 *   brute-force / scripting abuse from a single client within one instance's
 *   lifetime. It is intentionally dependency-free (no Redis) to match the
 *   project's current stack.
 *
 * For stricter, distributed rate limiting across all instances, set up Upstash
 * Redis + @upstash/ratelimit (see manual-review note in the PR summary). Until
 * then, this limiter raises the bar significantly over having nothing.
 *
 * Usage:
 *   import { checkRateLimit } from "@/lib/server/rate-limit";
 *
 *   const { ok, retryAfter } = checkRateLimit(`signup:${ip}`, 5, 60_000);
 *   if (!ok) {
 *     return NextResponse.json(
 *       { error: "Too many attempts. Please try again later." },
 *       { status: 429, headers: { "Retry-After": String(retryAfter) } }
 *     );
 *   }
 */

type Bucket = {
  /** Timestamps (ms) of each request in the current window. */
  hits: number[];
};

const store = new Map<string, Bucket>();

// Prevent the store from growing unbounded across a long-lived instance.
const MAX_STORE_SIZE = 10_000;

type RateLimitResult = {
  ok: boolean;
  /** Seconds the client should wait before retrying (0 if ok). */
  retryAfter: number;
};

/**
 * Returns `ok: true` if the request is allowed under the limit, or
 * `ok: false` with a `retryAfter` hint (seconds) if the limit is exceeded.
 *
 * @param key     Unique identifier for the caller (e.g. `signup:${ip}` or
 *                `ask:${userId}`).
 * @param limit   Maximum number of requests allowed in the window.
 * @param windowMs  Size of the sliding window in milliseconds.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Light GC: evict stale buckets opportunistically to bound memory.
  if (store.size > MAX_STORE_SIZE) {
    for (const [k, bucket] of store) {
      const last = bucket.hits[bucket.hits.length - 1];
      if (!last || last < cutoff) {
        store.delete(k);
      }
    }
  }

  const bucket = store.get(key);

  if (!bucket) {
    store.set(key, { hits: [now] });
    return { ok: true, retryAfter: 0 };
  }

  // Drop timestamps that fell outside the window (sliding window).
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    // Earliest hit that will expire — tells the client when to retry.
    const oldest = bucket.hits[0] ?? now;
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  bucket.hits.push(now);
  return { ok: true, retryAfter: 0 };
}

/**
 * Extracts a best-effort client IP from a Next.js Request.
 *
 * Vercel sets `x-forwarded-for`; the first entry is the originating client.
 * Falls back to "unknown" so the caller still has a key to pass to the limiter.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // First IP in the list is the original client.
    const first = forwarded.split(",")[0];
    if (first) {
      return first.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Standard rate-limit presets for Smart Jotter's sensitive endpoints.
 */
export const RATE_LIMITS = {
  /** Account creation — 5 signups per IP per 15 min. */
  signup: { limit: 5, windowMs: 15 * 60 * 1000 },
  /** Password reset — 3 requests per IP per 15 min (Supabase also limits). */
  passwordReset: { limit: 3, windowMs: 15 * 60 * 1000 },
  /** Payment verification — 10 per user per 10 min. */
  paymentVerify: { limit: 10, windowMs: 10 * 60 * 1000 },
  /** Payment status polling — 30 per user per 60s (read-only; the Android
   *  app polls every few seconds after returning from a payment). */
  paymentStatus: { limit: 30, windowMs: 60 * 1000 },
  /** AI ask/search/suggest — 20 per user per 60s (burst allowance). */
  ai: { limit: 20, windowMs: 60 * 1000 },
  /** Audio transcription — 10 per user per 60s (heavy cost). */
  transcribe: { limit: 10, windowMs: 60 * 1000 },
  /** Account deletion — 2 attempts per user per 15 min. */
  accountDeletion: { limit: 2, windowMs: 15 * 60 * 1000 }
} as const;