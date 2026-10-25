// Optional gate for the reviewer role on a shared or hosted demo. When REVIEWER_ACCESS_CODE is
// set, reviewer actions need the same code in the x-reviewer-code header or the hv-reviewer-code
// cookie. This is a demo gate, not authentication: there are still no user accounts.

import { createHash, timingSafeEqual } from 'node:crypto';

export const REVIEWER_CODE_COOKIE = 'hv-reviewer-code';

export function reviewerCodeRequired(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.REVIEWER_ACCESS_CODE?.trim();
}

export function reviewerCodeMatches(supplied: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  const expected = env.REVIEWER_ACCESS_CODE?.trim();
  if (!expected) return true;
  if (!supplied) return false;
  const a = createHash('sha256').update(supplied.trim()).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Read the code from a request: header first, then the cookie. */
export function suppliedReviewerCode(request: Request): string | null {
  const header = request.headers.get('x-reviewer-code');
  if (header) return header;
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${REVIEWER_CODE_COOKIE}=`));
  if (!match) return null;
  try { return decodeURIComponent(match.slice(REVIEWER_CODE_COOKIE.length + 1)); }
  catch { return null; } // A malformed cookie must fail the gate, not crash the request.
}
