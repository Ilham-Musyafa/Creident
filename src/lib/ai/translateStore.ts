import type { DatabaseSync } from 'node:sqlite';
import { canonicalJson } from '../audit/chain';
import type { StoredEvidence, TransactionRepository } from '../repository';
import { assistMode, type AssistResult } from './assist';
import type { AiEvidenceProvider } from './evidence';
import { textHash, translateEvidence, validateTranslation, TRANSLATE_VERSION, type EvidenceTranslation, type TranslationTarget } from './translate';

interface Options {
  db: DatabaseSync; repo: TransactionRepository; txId: string; evidence: StoredEvidence;
  target: TranslationTarget; now: () => string; env?: Record<string, string | undefined>; provider?: AiEvidenceProvider;
}
export interface TranslationResult extends AssistResult<EvidenceTranslation> {
  sourceHash: string; translationHash: string | null; target: TranslationTarget; cacheHit: boolean;
}
const inFlight = new WeakMap<DatabaseSync, Map<string, Promise<TranslationResult>>>();

export class TranslationChangedError extends Error {}
export async function cachedTranslation(options: Options): Promise<TranslationResult> {
  const { db, repo, txId, evidence, target } = options;
  const sourceHash = textHash(evidence.content); const env = options.env ?? process.env; const mode = assistMode(env);
  const id = 'translate-' + textHash(canonicalJson({ txId, evidenceId: evidence.id, sourceHash, target,
    version: TRANSLATE_VERSION, mode, model: mode === 'live' ? env.AI_MODEL ?? null : null, baseUrl: mode === 'live' ? env.AI_BASE_URL ?? null : null }));
  const load = (): TranslationResult | null => {
    const row = db.prepare("SELECT output_json, meta_json FROM ai_drafts WHERE id = ? AND tx_id = ? AND feature = 'translate'").get(id, txId);
    if (!row) return null;
    const saved = JSON.parse(String(row.output_json)) as TranslationResult;
    const output = validateTranslation(saved.output, evidence.content);
    if (!output || saved.sourceHash !== sourceHash || saved.meta.outputHash !== textHash(canonicalJson(output))) return null;
    return { ...saved, output, cacheHit: true };
  };
  const hit = load(); if (hit) return hit;
  let running = inFlight.get(db); if (!running) { running = new Map(); inFlight.set(db, running); }
  const pending = running.get(id); if (pending) { const shared = await pending; return { ...shared, cacheHit: shared.output !== null }; }
  const work = async (): Promise<TranslationResult> => {
    const result = await translateEvidence(evidence.content, target, { env, provider: options.provider });
    const current = repo.loadEvidence(txId).find(e => e.id === evidence.id);
    if (!current || textHash(current.content) !== sourceHash) throw new TranslationChangedError('Evidence changed during translation; read the current original');
    const response: TranslationResult = { ...result, sourceHash,
      translationHash: result.output ? textHash(result.output.translation) : null, target, cacheHit: false };
    const event = { txId, ts: options.now(), actor: 'reviewer', type: 'EVIDENCE_TRANSLATED', payload: {
      ...result.meta, evidenceId: evidence.id, sourceHash, translationHash: response.translationHash,
      detectedLanguage: result.output?.detectedLanguage ?? null, target, inputContainsInjection: result.inputContainsInjection,
    } };
    if (result.output) {
      const won = repo.storeAssistDraft(id, txId, 'translate', response, result.meta, event);
      // A second worker may have won the unique cache id; return the published winner.
      if (!won) return load() ?? { ...response, output: null, translationHash: null };
    } else repo.appendAuditEvent(event);
    return response;
  };
  const promise = work(); running.set(id, promise);
  try { return await promise; } finally { running.delete(id); }
}
