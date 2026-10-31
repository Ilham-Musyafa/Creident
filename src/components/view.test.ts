import { describe, expect, it } from 'vitest';
import { authorizationWindow, eventTitle, evidenceCode, isReserved, isSimulatedDeal, money, nextAction, timeLeft, deadlineUrgency, timelineFor, recentSuccess, celebrates } from './view';

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
    expect(timelineFor('VOIDED').at(-1)?.title).toBe('Payment cancelled');
    expect(timelineFor('FROZEN_EXTERNAL', 'IN_INSPECTION').some((s) => s.title === 'On hold · PayPal dispute')).toBe(true);
  });

  it('offers money-moving decisions only to the right role', () => {
    expect(nextAction('IN_INSPECTION', 'buyer')).toBe('confirm-or-dispute');
    expect(nextAction('IN_INSPECTION', 'seller')).toBe('none');
    expect(nextAction('UNDER_REVIEW', 'reviewer')).toBe('review');
    expect(nextAction('UNDER_REVIEW', 'buyer')).toBe('none');
  });

  it('names events and derives a stable evidence code', () => {
    expect(eventTitle('BUYER_APPROVED')).toBe('Payment approved');
    expect(eventTitle('SOMETHING_NEW')).toBe('something new');
    expect(evidenceCode('8c1e0000-0000-0000-0000-00000000a7f2')).toBe('CR-8C1E · A7F2');
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

describe('step completion animation', () => {
  const now = '2026-10-30T12:00:30Z';
  const justNow = '2026-10-30T12:00:00Z';
  it('has a label for every step that finishes, not only the final ones', () => {
    for (const status of ['TERMS_LOCKED', 'AUTHORIZED', 'SHIPPED', 'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'COMPLETED'] as const) {
      expect(recentSuccess(status, justNow, now), status).toBeTruthy();
    }
  });
  it('stays quiet for waiting states and for old events', () => {
    expect(recentSuccess('AWAITING_APPROVAL', justNow, now)).toBeNull();
    expect(recentSuccess('SHIPPED', '2026-10-30T11:00:00Z', now)).toBeNull();
  });
  it('uses confetti only for good endings', () => {
    expect(celebrates('COMPLETED')).toBe(true);
    expect(celebrates('DISPUTED')).toBe(false);
    expect(celebrates('SHIPPED')).toBe(false);
  });
});

describe('deadlineUrgency', () => {
  const now = '2026-10-21T09:00:00Z';
  it('is null above 24 hours, once passed, or without a deadline', () => {
    expect(deadlineUrgency('2026-10-22T09:00:01Z', now)).toBeNull();
    expect(deadlineUrgency('2026-10-21T09:00:00Z', now)).toBeNull();
    expect(deadlineUrgency('2026-10-20T09:00:00Z', now)).toBeNull();
    expect(deadlineUrgency(undefined, now)).toBeNull();
  });
  it('is soon between 6 and 24 hours and urgent under 6 hours', () => {
    expect(deadlineUrgency('2026-10-22T08:59:00Z', now)).toBe('soon');
    expect(deadlineUrgency('2026-10-21T15:00:00Z', now)).toBe('soon');
    expect(deadlineUrgency('2026-10-21T14:59:00Z', now)).toBe('urgent');
    expect(deadlineUrgency('2026-10-21T09:01:00Z', now)).toBe('urgent');
  });
});
