import { describe, expect, it } from 'vitest';
import { transition } from './stateMachine';
import type { Trigger, Tx, TxStatus } from './types';

const SHIP_BY = '2026-11-01T00:00:00Z';
const INSPECT_UNTIL = '2026-11-05T00:00:00Z';

function tx(status: TxStatus, extra: Partial<Tx> = {}): Tx {
  return { id: 'tx1', status, captured: false, shipBy: SHIP_BY, inspectionUntil: INSPECT_UNTIL, ...extra };
}

function run(start: Tx, ...triggers: Trigger[]): Tx {
  let cur = start;
  for (const t of triggers) {
    const r = transition(cur, t);
    if (!r.ok) throw new Error(`${t.type} failed: ${r.code}`);
    cur = r.tx;
  }
  return cur;
}

describe('happy path', () => {
  it('goes from draft to completed with the expected PayPal effects', () => {
    let cur = tx('DRAFT');
    const effects: string[] = [];
    const steps: Trigger[] = [
      { type: 'ACCEPT_TERMS', bothAccepted: true },
      { type: 'START_PAYMENT' },
      { type: 'BUYER_APPROVED', orderApproved: true },
      { type: 'SUBMIT_TRACKING', now: '2026-10-30T00:00:00Z' },
      { type: 'TRACKING_DELIVERED', destinationMatches: true },
      { type: 'BUYER_CONFIRM', externalDisputeOpen: false },
    ];
    for (const s of steps) {
      const r = transition(cur, s);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      effects.push(r.effect.kind);
      cur = r.tx;
    }
    expect(cur.status).toBe('COMPLETED');
    expect(cur.captured).toBe(true);
    expect(effects).toEqual(['NONE', 'PAYPAL_CREATE_ORDER', 'PAYPAL_AUTHORIZE', 'NONE', 'NONE', 'PAYPAL_CAPTURE']);
  });

  it('releases automatically when the inspection window expires', () => {
    const r = transition(tx('IN_INSPECTION'), { type: 'INSPECTION_EXPIRED', now: INSPECT_UNTIL, externalDisputeOpen: false });
    expect(r.ok && r.tx.status).toBe('COMPLETED');
    expect(r.ok && r.effect.kind).toBe('PAYPAL_CAPTURE');
  });
});

describe('guards', () => {
  it('refuses authorization before the buyer approves (Sandbox: ORDER_NOT_APPROVED)', () => {
    const r = transition(tx('AWAITING_APPROVAL'), { type: 'BUYER_APPROVED', orderApproved: false });
    expect(r).toMatchObject({ ok: false, code: 'ORDER_NOT_APPROVED' });
  });

  it('requires both parties to accept terms', () => {
    expect(transition(tx('DRAFT'), { type: 'ACCEPT_TERMS', bothAccepted: false })).toMatchObject({ ok: false, code: 'TERMS_NOT_ACCEPTED' });
  });

  it('voids when the seller misses the ship-by deadline', () => {
    const r = transition(tx('AUTHORIZED'), { type: 'SHIP_DEADLINE_PASSED', now: '2026-11-01T00:00:01Z' });
    expect(r.ok && r.tx.status).toBe('VOIDED');
    expect(r.ok && r.effect.kind).toBe('PAYPAL_VOID');
  });

  it('does not void before the deadline, and rejects late tracking', () => {
    expect(transition(tx('AUTHORIZED'), { type: 'SHIP_DEADLINE_PASSED', now: SHIP_BY })).toMatchObject({ ok: false, code: 'DEADLINE_NOT_REACHED' });
    expect(transition(tx('AUTHORIZED'), { type: 'SUBMIT_TRACKING', now: '2026-11-02T00:00:00Z' })).toMatchObject({ ok: false, code: 'DEADLINE_PASSED' });
  });

  it('sends a destination mismatch to review instead of inspection', () => {
    const r = transition(tx('SHIPPED'), { type: 'TRACKING_DELIVERED', destinationMatches: false });
    expect(r.ok && r.tx.status).toBe('UNDER_REVIEW');
  });

  it('only allows disputes inside the inspection window', () => {
    expect(transition(tx('IN_INSPECTION'), { type: 'OPEN_DISPUTE', now: '2026-11-04T00:00:00Z' })).toMatchObject({ ok: true });
    expect(transition(tx('IN_INSPECTION'), { type: 'OPEN_DISPUTE', now: INSPECT_UNTIL })).toMatchObject({ ok: false, code: 'DEADLINE_PASSED' });
  });

  it('does not release while a PayPal dispute is open', () => {
    expect(transition(tx('IN_INSPECTION'), { type: 'BUYER_CONFIRM', externalDisputeOpen: true })).toMatchObject({ ok: false, code: 'EXTERNAL_DISPUTE_OPEN' });
  });

  it('rejects triggers in the wrong state', () => {
    expect(transition(tx('DRAFT'), { type: 'START_PAYMENT' })).toMatchObject({ ok: false, code: 'INVALID_STATE' });
  });

  it('never moves out of a final state', () => {
    expect(transition(tx('COMPLETED', { captured: true }), { type: 'DECISION', outcome: 'REFUND' })).toMatchObject({ ok: false, code: 'FINAL_STATE' });
  });
});

describe('disputes and decisions', () => {
  const underReview = run(
    tx('IN_INSPECTION'),
    { type: 'OPEN_DISPUTE', now: '2026-11-03T00:00:00Z' },
    { type: 'EVIDENCE_COMPLETE' },
  );

  it('reaches review after evidence is complete', () => {
    expect(underReview.status).toBe('UNDER_REVIEW');
  });

  it('voids (not refunds) when refunding before capture', () => {
    const r = transition(underReview, { type: 'DECISION', outcome: 'REFUND' });
    expect(r.ok && r.tx.status).toBe('VOIDED');
    expect(r.ok && r.effect.kind).toBe('PAYPAL_VOID');
  });

  it('refunds when already captured (Sandbox: PREVIOUSLY_CAPTURED blocks void)', () => {
    const r = transition({ ...underReview, captured: true }, { type: 'DECISION', outcome: 'REFUND' });
    expect(r.ok && r.tx.status).toBe('REFUNDED');
    expect(r.ok && r.effect.kind).toBe('PAYPAL_REFUND');
  });

  it('captures on release', () => {
    const r = transition(underReview, { type: 'DECISION', outcome: 'RELEASE' });
    expect(r.ok && r.tx.status).toBe('COMPLETED');
    expect(r.ok && r.tx.captured).toBe(true);
  });
});

describe('external PayPal disputes', () => {
  it('freezes and later resumes the previous state', () => {
    const frozen = run(tx('IN_INSPECTION'), { type: 'EXTERNAL_DISPUTE' });
    expect(frozen.status).toBe('FROZEN_EXTERNAL');
    expect(frozen.frozenFrom).toBe('IN_INSPECTION');
    expect(transition(frozen, { type: 'BUYER_CONFIRM', externalDisputeOpen: false })).toMatchObject({ ok: false, code: 'INVALID_STATE' });
    expect(transition(frozen, { type: 'EXTERNAL_DISPUTE' })).toMatchObject({ ok: false, code: 'ALREADY_FROZEN' });
    const resumed = run(frozen, { type: 'EXTERNAL_RESOLVED' });
    expect(resumed.status).toBe('IN_INSPECTION');
    expect(resumed.frozenFrom).toBeUndefined();
  });
});

describe('cancel', () => {
  it('is allowed only before authorization', () => {
    expect(transition(tx('AWAITING_APPROVAL'), { type: 'CANCEL' })).toMatchObject({ ok: true, effect: { kind: 'NONE' } });
    expect(transition(tx('AUTHORIZED'), { type: 'CANCEL' })).toMatchObject({ ok: false, code: 'INVALID_STATE' });
  });
});

it('does not mutate the input transaction', () => {
  const start = tx('DRAFT');
  const copy = structuredClone(start);
  transition(start, { type: 'ACCEPT_TERMS', bothAccepted: true });
  expect(start).toEqual(copy);
});

describe('return before refund', () => {
  const RETURN_BY = '2026-11-10T00:00:00Z';
  const pending = (captured = false) => tx('RETURN_REQUESTED', { captured, returnBy: RETURN_BY });

  it('moves no money when a refund requires the item back', () => {
    const r = transition(tx('UNDER_REVIEW'), { type: 'DECISION', outcome: 'REFUND', requireReturn: true });
    expect(r).toMatchObject({ ok: true, tx: { status: 'RETURN_REQUESTED' }, effect: { kind: 'NONE' } });
  });

  it('still refunds at once when the return is waived', () => {
    const r = transition(tx('UNDER_REVIEW'), { type: 'DECISION', outcome: 'REFUND' });
    expect(r).toMatchObject({ ok: true, tx: { status: 'VOIDED' }, effect: { kind: 'PAYPAL_VOID' } });
  });

  it('voids, or refunds a capture, once the return reaches the seller in time', () => {
    expect(transition(pending(), { type: 'RETURN_DELIVERED', now: '2026-11-09T00:00:00Z', destinationMatches: true }))
      .toMatchObject({ ok: true, tx: { status: 'VOIDED' }, effect: { kind: 'PAYPAL_VOID' } });
    expect(transition(pending(true), { type: 'RETURN_DELIVERED', now: '2026-11-09T00:00:00Z', destinationMatches: true }))
      .toMatchObject({ ok: true, tx: { status: 'REFUNDED' }, effect: { kind: 'PAYPAL_REFUND' } });
  });

  it('rejects a return delivered elsewhere or after the deadline', () => {
    expect(transition(pending(), { type: 'RETURN_DELIVERED', now: '2026-11-09T00:00:00Z', destinationMatches: false }))
      .toMatchObject({ ok: false, code: 'RETURN_WRONG_DESTINATION' });
    expect(transition(pending(), { type: 'RETURN_DELIVERED', now: '2026-11-11T00:00:00Z', destinationMatches: true }))
      .toMatchObject({ ok: false, code: 'DEADLINE_PASSED' });
  });

  it('releases to the seller only after the return deadline has passed', () => {
    expect(transition(pending(), { type: 'RETURN_DEADLINE_PASSED', now: '2026-11-09T00:00:00Z' }))
      .toMatchObject({ ok: false, code: 'DEADLINE_NOT_REACHED' });
    expect(transition(pending(), { type: 'RETURN_DEADLINE_PASSED', now: '2026-11-11T00:00:00Z' }))
      .toMatchObject({ ok: true, tx: { status: 'COMPLETED', captured: true }, effect: { kind: 'PAYPAL_CAPTURE' } });
  });

  it('can be frozen by an external PayPal dispute while the return is pending', () => {
    expect(transition(pending(), { type: 'EXTERNAL_DISPUTE' })).toMatchObject({ ok: true, tx: { status: 'FROZEN_EXTERNAL', frozenFrom: 'RETURN_REQUESTED' } });
  });
});
