import type { StoredTx } from '../lib/repository';
import { resolveDealCategory } from '../lib/dealCategories';

export interface DealFormValues {
  item: string; amount: string; condition: string; description: string;
  criteria: string; category: string; subcategory: string; includedItems: string;
}
export const emptyDealForm: DealFormValues = { item: '', amount: '', condition: '', description: '', criteria: '', category: '', subcategory: '', includedItems: '' };

/** Preserve legacy strings and hidden metadata; only the visible editable fields are replaced on save. */
export function draftFormValues(tx: Pick<StoredTx, 'item' | 'amount' | 'termsJson'>): DealFormValues {
  const terms = JSON.parse(tx.termsJson) as Record<string, unknown>;
  const { category, subcategory } = resolveDealCategory(terms.category, terms.subcategory);
  const lines = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').join('\n') : '';
  return { item: tx.item, amount: tx.amount, condition: typeof terms.condition === 'string' ? terms.condition : '', description: typeof terms.description === 'string' ? terms.description : '', category: category.id, subcategory: subcategory?.id ?? '', criteria: lines(terms.criteria), includedItems: lines(terms.includedItems) };
}
