/**
 * Best-effort in-memory sliding window rate limiter for Vercel serverless functions.
 *
 * Caveats:
 * - State lives in the isolate's memory. Vercel may spin up multiple isolates
 *   under load, each with its own counter — so this is not a hard guarantee.
 * - Still effective against casual abuse, scripts, and single-origin attacks.
 * - The cleanup runs on every check to prevent unbounded memory growth.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // per IP per window
const CLEANUP_THRESHOLD = 1000; // purge stale entries when map exceeds this size

const hits = new Map<string, number[]>();

function cleanup(now: number): void {
  if (hits.size <= CLEANUP_THRESHOLD) return;

  for (const [key, timestamps] of hits) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, valid);
    }
  }
}

/**
 * Check if a request from the given IP should be rate-limited.
 * Returns `{ limited: false }` if allowed, or `{ limited: true, retryAfter }` if blocked.
 */
export function checkRateLimit(
  ip: string,
): { limited: false } | { limited: true; retryAfter: number } {
  const now = Date.now();
  cleanup(now);

  const timestamps = hits.get(ip) ?? [];
  const windowStart = now - WINDOW_MS;
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= MAX_REQUESTS) {
    // Earliest timestamp that will expire
    const oldest = recent[0]!;
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter: Math.max(retryAfter, 1) };
  }

  recent.push(now);
  hits.set(ip, recent);
  return { limited: false };
}

/**
 * Reset internal state. For testing only.
 * @internal
 */
export function __resetForTesting(): void {
  hits.clear();
}

/**
 * Get internal state size. For testing only.
 * @internal
 */
export function __getMapSizeForTesting(): number {
  return hits.size;
}
