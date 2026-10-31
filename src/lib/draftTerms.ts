import { createHash } from 'node:crypto';
import { canonicalJson } from './audit/chain';
import type { StoredTx } from './repository';
import { canEditDraft } from './draftEligibility';
export { canEditDraft } from './draftEligibility';

/** Includes price/item as well as terms, so a stale form cannot silently accept or replace newer terms. */
export function draftRevision(tx: Pick<StoredTx, 'item' | 'amount' | 'currency' | 'termsJson'>): string {
  return createHash('sha256').update(canonicalJson({ item: tx.item, amount: tx.amount, currency: tx.currency, terms: JSON.parse(tx.termsJson) })).digest('hex');
}

export class DraftTermsChangedError extends Error {
  constructor() { super('The terms changed. Refresh the page and check them again.'); }
}

/** Record field names only, never the old/new user text. Unknown term keys use one fixed label. */
export function changedDraftFields(before: Pick<StoredTx, 'item' | 'amount' | 'termsJson'>, after: Pick<StoredTx, 'item' | 'amount' | 'termsJson'>): string[] {
  const fields = ['item', 'amount'].filter(key => before[key as 'item' | 'amount'] !== after[key as 'item' | 'amount']);
  const oldTerms = JSON.parse(before.termsJson), newTerms = JSON.parse(after.termsJson);
  const known = ['condition', 'category', 'subcategory', 'description', 'includedItems', 'criteria'];
  for (const key of new Set([...Object.keys(oldTerms), ...Object.keys(newTerms)])) {
    if (canonicalJson(oldTerms[key] ?? null) !== canonicalJson(newTerms[key] ?? null)) fields.push(known.includes(key) ? `terms.${key}` : 'terms.other');
  }
  return [...new Set(fields)].sort();
}
