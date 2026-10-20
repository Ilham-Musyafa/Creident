import { describe, expect, it } from 'vitest';
import { appendEvent, canonicalJson, GENESIS_HASH, verifyChain } from './chain';
import type { AuditEvent, AuditEventInput } from './chain';

function build(inputs: AuditEventInput[]): AuditEvent[] {
  const chain: AuditEvent[] = [];
  for (const i of inputs) chain.push(appendEvent(chain, i));
  return chain;
}

const inputs: AuditEventInput[] = [
  { txId: 'tx1', ts: '2026-10-20T15:00:00Z', actor: 'seller', type: 'TERMS_CREATED', payload: { item: 'Phone', amount: '10.00' } },
  { txId: 'tx1', ts: '2026-10-20T15:05:00Z', actor: 'buyer', type: 'TERMS_ACCEPTED', payload: {} },
  { txId: 'tx1', ts: '2026-10-20T15:10:00Z', actor: 'system', type: 'PAYPAL_AUTHORIZED', payload: { debugId: 'abc' } },
];

describe('canonicalJson', () => {
  it('sorts keys at every level so equal data hashes equally', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } })).toBe('{"a":{"c":[3,{"e":0,"f":1}],"d":2},"b":1}');
  });
  it('rejects values that JSON cannot represent faithfully', () => {
    expect(() => canonicalJson(Number.NaN)).toThrow();
    expect(() => canonicalJson(undefined)).toThrow();
  });
});

describe('hash chain', () => {
  it('links each event to the previous one', () => {
    const chain = build(inputs);
    expect(chain[0]!.prevHash).toBe(GENESIS_HASH);
    expect(chain[1]!.prevHash).toBe(chain[0]!.hash);
    expect(chain.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(verifyChain(chain)).toEqual({ ok: true, head: chain[2]!.hash, length: 3 });
  });

  it('detects an edited payload', () => {
    const chain = build(inputs);
    chain[0] = { ...chain[0]!, payload: { item: 'Phone', amount: '1.00' } };
    expect(verifyChain(chain)).toMatchObject({ ok: false, brokenAtSeq: 1 });
  });

  it('detects an edited event even if its own hash is recomputed', () => {
    const chain = build(inputs);
    const forged = appendEvent(chain.slice(0, 1), { ...inputs[1]!, actor: 'admin' });
    chain[1] = forged;
    // The forged event is self-consistent, but the next event still points to the old hash.
    expect(verifyChain(chain)).toMatchObject({ ok: false, brokenAtSeq: 3 });
  });

  it('detects a deleted event', () => {
    const chain = build(inputs);
    chain.splice(1, 1);
    expect(verifyChain(chain)).toMatchObject({ ok: false, brokenAtSeq: 2 });
  });

  it('detects reordering', () => {
    const chain = build(inputs);
    [chain[1], chain[2]] = [chain[2]!, chain[1]!];
    expect(verifyChain(chain).ok).toBe(false);
  });

  it('verifies an empty chain to the genesis hash', () => {
    expect(verifyChain([])).toEqual({ ok: true, head: GENESIS_HASH, length: 0 });
  });
});
