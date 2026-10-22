import { describe, expect, it } from 'vitest';
import { assistCounts } from './oversight';
import { appendEvent, type AuditEvent } from './audit/chain';

describe('oversight assist metrics', () => {
  it('counts recorded results, unavailable/injection flags and adoption once, not money-stage duplicates', () => {
    let events: AuditEvent[] = [];
    const add = (type: string, payload: Record<string, unknown>, txId = 'tx') => { events = [...events, appendEvent(events, { txId, type, payload, ts: '2026-10-22T00:00:00Z', actor: 'reviewer' })]; };
    add('AI_DRAFT_CREATED', { feature: 'copilot', outputHash: 'abc', draftId: 'd1', inputContainsInjection: true });
    add('AI_DRAFT_CREATED', { feature: 'copilot', outputHash: null, unavailable: 'INVALID_OUTPUT' });
    const aiDraft = { feature: 'copilot', draftId: 'd1', outputHash: 'abc', accepted: 'unchanged' };
    add('DECISION', { aiDraft }); add('PARTIAL_REFUND_CAPTURED', { aiDraft }); add('PARTIAL_REFUND_COMPLETED', { aiDraft });
    add('DECISION', { aiDraft });
    add('DECISION', { aiDraft: { ...aiDraft, draftId: 'd2', accepted: 'edited' } });
    add('TRANSACTION_CREATED', { feature: 'terms', outputHash: 'def', accepted: 'edited', inputContainsInjection: true });
    add('EVIDENCE_TRANSLATED', { feature: 'translate', outputHash: 'xyz' });
    add('EVIDENCE_CHECK_RUN', { feature: 'evidence-check', outputHash: null, unavailable: 'NO_REPLAY', inputContainsInjection: true });
    add('PAYPAL_ERROR', { feature: 'not-an-assist', outputHash: null });
    expect(assistCounts(events)).toEqual([
      { feature: 'copilot', created: 1, unchanged: 1, edited: 1, unavailable: 1, injection: 1 },
      { feature: 'evidence-check', created: 0, unchanged: 0, edited: 0, unavailable: 1, injection: 1 },
      { feature: 'terms', created: 1, unchanged: 0, edited: 1, unavailable: 0, injection: 1 },
      { feature: 'translate', created: 1, unchanged: 0, edited: 0, unavailable: 0, injection: 0 },
    ]);
  });
});
