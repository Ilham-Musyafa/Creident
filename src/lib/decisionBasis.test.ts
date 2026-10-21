import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decisionBasis, evidenceDigest } from './decisionBasis';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const evidence = [
  { id: 'a', submittedBy: 'buyer', kind: 'note', content: 'Synthetic buyer evidence' },
  { id: 'b', submittedBy: 'seller', kind: 'photo', content: 'Synthetic seller evidence' },
];

describe('decision basis', () => {
  it('hashes the canonical ordered evidence list with content hashes', () => {
    const canonical = '[' + evidence.map(e => JSON.stringify({
      id: e.id, kind: e.kind, sha256: hash(e.content), submittedBy: e.submittedBy,
    })).join(',') + ']';
    expect(evidenceDigest(evidence)).toBe(hash(canonical));
    expect(evidenceDigest([])).toBe(hash('[]'));
    expect(evidenceDigest([...evidence].reverse())).not.toBe(evidenceDigest(evidence));
    for (const field of ['id', 'submittedBy', 'kind', 'content'] as const) {
      expect(evidenceDigest([{ ...evidence[0]!, [field]: 'changed' }, evidence[1]!])).not.toBe(evidenceDigest(evidence));
    }
  });

  it('canonicalizes terms and detects changed terms', () => {
    const basis = decisionBasis('{"b":2,"a":1}', evidence);
    expect(basis.termsHash).toBe(hash('{"a":1,"b":2}'));
    expect(decisionBasis('{"a":1,"b":2}', evidence)).toEqual(basis);
    expect(decisionBasis('{"a":2,"b":2}', evidence).termsHash).not.toBe(basis.termsHash);
  });
});
