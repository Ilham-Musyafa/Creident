// Dedicated copilot storage; outbound drafts.ts remains independently owned.
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { AssistMeta } from './assist';
import type { CopilotDraft } from './copilot';
import type { DecisionBasis } from '../decisionBasis';

export interface StoredCopilot { id: string; output: CopilotDraft; meta: AssistMeta; basis: DecisionBasis }
export function saveCopilot(db: DatabaseSync, txId: string, output: CopilotDraft, meta: AssistMeta, basis: DecisionBasis, now: string): StoredCopilot {
  const id = randomUUID();
  db.prepare('INSERT INTO ai_drafts (id, tx_id, feature, output_json, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, txId, 'copilot', JSON.stringify({ draft: output, basis }), JSON.stringify(meta), now);
  return { id, output, meta, basis };
}
export function loadCopilot(db: DatabaseSync, id: string, txId: string): StoredCopilot | null {
  const row = db.prepare("SELECT output_json, meta_json FROM ai_drafts WHERE id = ? AND tx_id = ? AND feature = 'copilot'").get(id, txId);
  if (!row) return null;
  const stored = JSON.parse(String(row.output_json));
  return { id, output: stored.draft, basis: stored.basis, meta: JSON.parse(String(row.meta_json)) };
}
export function copilotAudit(draft: StoredCopilot, reason: string) {
  const { feature, mode, model, promptVersion, promptHash, outputHash } = draft.meta;
  return { aiDraft: { draftId: draft.id, feature, mode, model, promptVersion, promptHash, outputHash,
    accepted: reason === draft.output.reason ? 'unchanged' : 'edited' } };
}
