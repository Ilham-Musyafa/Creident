// Small in-memory, per-client rate limiter for the single-instance public demo. Not shared
// between instances or restarts; it only blunts casual abuse of the hosted demo.

export interface RateLimitRule { limit: number; windowMs: number }
export interface RateLimitResult { allowed: boolean; retryAfterSeconds: number }

export function createRateLimiter(rule: RateLimitRule, maxKeys = 5_000) {
  const hits = new Map<string, number[]>();
  return function check(key: string, now = Date.now()): RateLimitResult {
    const since = now - rule.windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= rule.limit) {
      hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0]! + rule.windowMs - now) / 1000)) };
    }
    recent.push(now);
    hits.delete(key); hits.set(key, recent); // re-insert so the oldest keys are evicted first
    if (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

/** First address in X-Forwarded-For (set by the hosting proxy), else a shared bucket. */
export function clientKey(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || 'unknown';
}
