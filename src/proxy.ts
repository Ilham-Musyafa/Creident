import { NextResponse, type NextRequest } from 'next/server';
import { isPublicDemo } from './lib/publicDemo';
import { clientKey, createRateLimiter } from './lib/rateLimit';

// Public demo only: limit API calls per client. Local development and tests are unaffected.
const writes = createRateLimiter({ limit: 30, windowMs: 60_000 });
const reads = createRateLimiter({ limit: 240, windowMs: 60_000 });

export function proxy(request: NextRequest) {
  if (!isPublicDemo()) return NextResponse.next();
  const key = clientKey(request.headers);
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const result = write ? writes(key) : reads(key);
  if (result.allowed) return NextResponse.next();
  return NextResponse.json(
    { error: 'RATE_LIMITED', message: `Too many requests. Please wait ${result.retryAfterSeconds} seconds and try again.` },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
  );
}

export const config = { matcher: '/api/:path*' };
