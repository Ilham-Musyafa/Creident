import { resolveDealCategory } from '../lib/dealCategories';

export const CONDITION_OPTIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Good Enough'] as const;

export function conditionFromDraft(value: string): string {
  if (CONDITION_OPTIONS.some(option => option === value)) return value;
  const normalized = value.toLowerCase();
  if (normalized.includes('like new')) return 'Used - Like New';
  if (normalized.includes('good enough')) return 'Used - Good Enough';
  if (normalized.startsWith('new')) return 'New';
  if (normalized.includes('good')) return 'Used - Good';
  return '';
}

export function categorySummary(categoryId: string, subcategoryId: string): string {
  if (!categoryId) return 'Not chosen';
  const { category, subcategory } = resolveDealCategory(categoryId, subcategoryId);
  return subcategory ? `${category.label} / ${subcategory.label}` : category.label;
}

export function priceHelper(simulated: boolean): string {
  return simulated ? 'Test price in USD. No real money moves.' : 'Sandbox test price in USD.';
}
