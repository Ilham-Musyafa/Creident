import { describe, expect, it } from 'vitest';
import { clientKey, createRateLimiter } from './rateLimit';

describe('rate limiter', () => {
  it('allows up to the limit per window, then reports when to retry', () => {
    const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(check('a', 0).allowed).toBe(true);
    expect(check('a', 1_000).allowed).toBe(true);
    expect(check('a', 2_000)).toEqual({ allowed: false, retryAfterSeconds: 58 });
    expect(check('b', 2_000).allowed).toBe(true);
    expect(check('a', 60_001).allowed).toBe(true);
  });
  it('bounds memory by evicting the oldest client', () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 }, 2);
    check('a', 0); check('b', 0); check('c', 0);
    expect(check('a', 1).allowed).toBe(true);
  });
  it('uses the first forwarded address', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientKey(new Headers())).toBe('unknown');
  });
});
