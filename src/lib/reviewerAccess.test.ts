import { describe, expect, it } from 'vitest';
import { reviewerCodeMatches, reviewerCodeRequired, suppliedReviewerCode } from './reviewerAccess';

describe('reviewer access code', () => {
  it('is off unless REVIEWER_ACCESS_CODE is set', () => {
    expect(reviewerCodeRequired({})).toBe(false);
    expect(reviewerCodeMatches(null, {})).toBe(true);
  });
  it('accepts only the configured code', () => {
    const env = { REVIEWER_ACCESS_CODE: 'judge-2026' };
    expect(reviewerCodeRequired(env)).toBe(true);
    expect(reviewerCodeMatches('judge-2026', env)).toBe(true);
    expect(reviewerCodeMatches('wrong', env)).toBe(false);
    expect(reviewerCodeMatches(null, env)).toBe(false);
  });
  it('reads the header before the cookie', () => {
    const viaCookie = new Request('http://x/', { headers: { cookie: 'hv-role=reviewer; hv-reviewer-code=abc%20d' } });
    expect(suppliedReviewerCode(viaCookie)).toBe('abc d');
    const viaHeader = new Request('http://x/', { headers: { 'x-reviewer-code': 'h', cookie: 'hv-reviewer-code=c' } });
    expect(suppliedReviewerCode(viaHeader)).toBe('h');
  });
});
