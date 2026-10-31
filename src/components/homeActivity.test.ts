import { describe, expect, it, vi } from 'vitest';
import { recentHomeActivity } from './homeActivity';
import type { AuditEvent } from '../lib/audit/chain';
const deals = [
  { id: 'a', item: '[Demo] Camera', buyerId: 'buyer', sellerId: 'another-seller' },
  { id: 'b', item: 'Helmet', buyerId: 'another-buyer', sellerId: 'seller' },
];
const event = (seq: number, ts: string, type = 'OPEN_DISPUTE'): AuditEvent => ({ txId: '', seq, ts, type, actor: 'buyer', payload: {}, hash: 'hash', prevHash: 'previous' });

describe('Recent Home activity', () => {
  it('sorts across deals newest first and limits the total to five without mutating events', () => {
    const events = { a: [event(1, '2026-10-31T01:00:00Z'), event(2, '2026-10-31T03:00:00Z'), event(3, '2026-10-31T05:00:00Z')], b: [event(1, '2026-10-31T02:00:00Z'), event(2, '2026-10-31T04:00:00Z'), event(3, '2026-10-31T06:00:00Z')] };
    const result = recentHomeActivity(deals, 'reviewer', id => events[id as keyof typeof events]);
    expect(result.map(e => `${e.dealId}:${e.seq}`)).toEqual(['b:3', 'a:3', 'b:2', 'a:2', 'b:1']);
    expect(events.a.map(e => e.seq)).toEqual([1, 2, 3]);
  });
  it('orders by recorded time before limiting, even when sequence order differs', () => {
    const events = Array.from({ length: 8 }, (_, i) => event(i + 1, `2026-10-31T0${7 - i}:00:00Z`));
    expect(recentHomeActivity([deals[0]!], 'buyer', () => events).map(e => e.seq)).toEqual([1, 2, 3, 4, 5]);
  });
  it('reads only the buyer or seller party deals, while reviewers retain existing deal-page visibility', () => {
    const read = vi.fn(() => [event(1, '2026-10-31T01:00:00Z')]);
    expect(recentHomeActivity(deals, 'buyer', read).map(e => e.dealId)).toEqual(['a']);
    expect(read.mock.calls).toEqual([['a']]);
    read.mockClear();
    expect(recentHomeActivity(deals, 'seller', read).map(e => e.dealId)).toEqual(['b']);
    expect(read.mock.calls).toEqual([['b']]);
    expect(recentHomeActivity(deals, 'reviewer', read)).toHaveLength(2);
  });
  it('reuses deal activity labels and omissions, strips display-only demo prefixes', () => {
    const result = recentHomeActivity(deals, 'buyer', () => [event(1, '2026-10-31T01:00:00Z'), event(2, '2026-10-31T02:00:00Z', 'AI_DRAFT_CREATED')]);
    expect(result).toMatchObject([{ text: 'Buyer reported a problem', kind: 'dispute', item: 'Camera', dealId: 'a' }]);
    expect(result).toHaveLength(1);
  });
  it('returns no activity for empty or invisible deals without reading hidden events', () => {
    const read = vi.fn(() => []);
    expect(recentHomeActivity([], 'reviewer', read)).toEqual([]);
    expect(recentHomeActivity([deals[1]!], 'buyer', read)).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
});
