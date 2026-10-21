import { createHash } from 'node:crypto';
import { canonicalJson } from './audit/chain';

interface Evidence {
  id: string;
  submittedBy: string;
  kind: string;
  content: string;
}

export interface DecisionBasis {
  termsHash: string;
  evidenceDigest: string;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** Preserve repository order (created_at, id), independent of AI presentation order. */
export function evidenceDigest(evidence: readonly Evidence[]): string {
  return sha256(canonicalJson(evidence.map(({ id, submittedBy, kind, content }) => ({
    id, submittedBy, kind, sha256: sha256(content),
  }))));
}

export function decisionBasis(termsJson: string, evidence: readonly Evidence[]): DecisionBasis {
  return { termsHash: sha256(canonicalJson(JSON.parse(termsJson))), evidenceDigest: evidenceDigest(evidence) };
}
