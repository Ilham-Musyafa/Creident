import { describe, expect, it } from 'vitest';
import { isPublicDemo, publicDemoProblems } from './publicDemo';

const safe = { PUBLIC_DEMO: '1', PAYPAL_MODE: 'simulated', AI_MODE: 'replay' };

describe('public demo lock', () => {
  it('is off unless PUBLIC_DEMO is exactly 1', () => {
    expect(isPublicDemo({})).toBe(false);
    expect(isPublicDemo({ PUBLIC_DEMO: 'true' })).toBe(false);
    expect(publicDemoProblems({ PP_SECRET: 'x' })).toEqual([]);
  });
  it('accepts the simulated + replay setup without secrets', () => {
    expect(publicDemoProblems(safe)).toEqual([]);
  });
  it('rejects sandbox mode, live AI and any secret', () => {
    const problems = publicDemoProblems({ PUBLIC_DEMO: '1', AI_MODE: 'live', PP_ID: 'id', PP_SECRET: 's', AI_API_KEY: 'k', AUDIT_SIGNING_KEY: 'pem' });
    expect(problems).toEqual([
      'PAYPAL_MODE must be "simulated"', 'AI_MODE must be "replay"',
      'PP_ID must not be set', 'PP_SECRET must not be set', 'AI_API_KEY must not be set', 'AUDIT_SIGNING_KEY must not be set',
    ]);
  });
  it('ignores blank secret values', () => {
    expect(publicDemoProblems({ ...safe, PP_SECRET: '  ' })).toEqual([]);
  });
});
