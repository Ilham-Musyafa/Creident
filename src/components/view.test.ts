import { describe, expect, it } from 'vitest';
import { authorizationWindow, eventTitle, evidenceCode, isReserved, isSimulatedDeal, money, nextAction, timeLeft, timelineFor } from './view';

describe('view helpers', () => {
  it('formats money and time left', () => {
    expect(money('120.00')).toBe('$120.00');
    expect(timeLeft('2026-10-22T13:00:00Z', '2026-10-21T09:00:00Z')).toBe('1d 4h left');
    expect(timeLeft('2026-10-21T09:30:00Z', '2026-10-21T09:00:00Z')).toBe('30m left');
    expect(timeLeft('2026-10-20T09:00:00Z', '2026-10-21T09:00:00Z')).toBeNull();
  });

  it('counts only authorized, uncaptured statuses as reserved', () => {
    expect(isReserved('IN_INSPECTION', false)).toBe(true);
    expect(isReserved('COMPLETED', true)).toBe(false);
    expect(isReserved('TERMS_LOCKED', false)).toBe(false);
  });

  it('builds a timeline with exactly one current step for active deals', () => {
    for (const status of ['DRAFT', 'TERMS_LOCKED', 'AUTHORIZED', 'IN_INSPECTION', 'UNDER_REVIEW'] as const) {
      expect(timelineFor(status).filter((s) => s.state === 'current')).toHaveLength(1);
    }
    expect(timelineFor('COMPLETED').every((s) => s.state === 'done')).toBe(true);
    expect(timelineFor('VOIDED').at(-1)?.title).toBe('Authorization voided');
    expect(timelineFor('FROZEN_EXTERNAL', 'IN_INSPECTION').some((s) => s.title === 'Frozen by PayPal')).toBe(true);
  });

  it('offers money-moving decisions only to the right role', () => {
    expect(nextAction('IN_INSPECTION', 'buyer')).toBe('confirm-or-dispute');
    expect(nextAction('IN_INSPECTION', 'seller')).toBe('none');
    expect(nextAction('UNDER_REVIEW', 'reviewer')).toBe('review');
    expect(nextAction('UNDER_REVIEW', 'buyer')).toBe('none');
  });

  it('names events and derives a stable evidence code', () => {
    expect(eventTitle('BUYER_APPROVED')).toBe('Payment authorized');
    expect(eventTitle('SOMETHING_NEW')).toBe('something new');
    expect(evidenceCode('8c1e0000-0000-0000-0000-00000000a7f2')).toBe('HV-8C1E · A7F2');
  });
});

describe('isSimulatedDeal', () => {
  it('flags demo and simulated PayPal ids only', () => {
    expect(isSimulatedDeal({ paypalOrderId: 'SIM-ORDER-1' })).toBe(true);
    expect(isSimulatedDeal({ paypalOrderId: 'DEMO-ORDER-1' })).toBe(true);
    expect(isSimulatedDeal({ paypalOrderId: '5O190127TN364715T' })).toBe(false);
    expect(isSimulatedDeal({})).toBe(false);
  });
});

describe('authorizationWindow', () => {
  it('marks the 3-day honor period and the 29-day expiry', () => {
    const at = '2026-10-01T00:00:00.000Z';
    expect(authorizationWindow(at, '2026-10-03T23:00:00.000Z')).toMatchObject({ phase: 'honor', honorEndsAt: '2026-10-04T00:00:00.000Z' });
    expect(authorizationWindow(at, '2026-10-05T00:00:00.000Z').phase).toBe('after-honor');
    expect(authorizationWindow(at, '2026-10-30T00:00:00.000Z')).toMatchObject({ phase: 'expired', expiresAt: '2026-10-30T00:00:00.000Z' });
  });
});
