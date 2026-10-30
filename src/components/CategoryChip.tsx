import { resolveDealCategory } from '../lib/dealCategories';
export function CategoryChip({ category, subcategory, full = false }: { category?: unknown; subcategory?: unknown; full?: boolean }) {
  const resolved = resolveDealCategory(category, subcategory);
  return <span className="mt-1 inline-block max-w-full break-words rounded-full border border-line bg-surface-2 px-2 py-1 text-xs font-medium text-heading">{resolved.category.label}{full && resolved.subcategory ? ` / ${resolved.subcategory.label}` : ''}</span>;
}
