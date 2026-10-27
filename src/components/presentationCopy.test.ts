import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { demoName, evidenceLabel, evidenceAlias, PAYMENT_ACTION_LABELS } from './presentationCopy';
import { RuleLabel } from './RuleLabel';
import { ErrorNote, ApiError } from './client';
import { NewDealForm } from './NewDealForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

describe('User-facing glossary', () => {
  it('uses the same demo name casing and descriptive evidence labels', () => {
    expect(['buyer', 'seller', 'reviewer'].map(role => demoName(role as 'buyer' | 'seller' | 'reviewer'))).toEqual(['Demo Buyer', 'Demo Seller', 'Demo Reviewer']);
    expect(evidenceLabel('buyer', 1)).toBe('Buyer evidence 1');
    expect(evidenceAlias('B1')).toBe('Buyer evidence 1');
    expect(evidenceAlias('S2')).toBe('Seller evidence 2');
    expect(evidenceAlias('internal-uuid')).toBe('Evidence reference unavailable');
    expect(PAYMENT_ACTION_LABELS.RELEASE).toBe('Charge the buyer (capture)');
  });
  it('puts a shared rule title before its secondary code without inventing unknown rules', () => {
    const html = renderToStaticMarkup(createElement(RuleLabel, { rule: 'R4' }));
    expect(html).toContain('Evidence clearly supports one side');
    expect(html.indexOf('Evidence clearly supports one side')).toBeLessThan(html.indexOf('>R4<'));
    expect(renderToStaticMarkup(createElement(RuleLabel, { rule: 'unknown' }))).toContain('No rule recorded');
  });
  it('keeps raw error messages, codes and debug IDs out of the plain message', () => {
    const html = renderToStaticMarkup(createElement(ErrorNote, { error: new ApiError('PAYPAL_CAPTURE_FAILED', 'INSTRUMENT_DECLINED', 'debug-example') }));
    const plain = html.split('<details')[0];
    expect(plain).toContain("PayPal couldn&#x27;t complete this step. Try again later.");
    for (const raw of ['PAYPAL_CAPTURE_FAILED', 'INSTRUMENT_DECLINED', 'debug-example']) {
      expect(plain).not.toContain(raw);
      expect(html).toContain(raw);
    }
    expect(html).toContain('Technical details</summary>');
    expect(html).not.toContain('<details open');
  });
  it.each([true, false])('uses the actual new-deal mode when simulated=%s', simulated => {
    const html = renderToStaticMarkup(createElement(NewDealForm, { simulated, time: { shipByDays: 3, inspectionDays: 2, evidenceDays: 2 } }));
    expect(html).toContain(simulated ? 'Simulated payments' : 'PayPal Sandbox');
    expect(html).toContain('>Create deal</button>');
    expect(html).not.toContain('USD · Sandbox demo');
  });
});
