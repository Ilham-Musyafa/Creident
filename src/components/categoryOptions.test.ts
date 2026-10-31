import { describe, expect, it } from 'vitest';
import { alphabeticalOptions } from './categoryOptions';
import { DEAL_CATEGORIES } from '../lib/dealCategories';

describe('Alphabetical picker options', () => {
  it('sorts A–Z without case priority and keeps Other last', () => {
    const options = [{ id: 'z', label: 'Zebra' }, { id: 'other', label: 'Other' }, { id: 'b', label: 'banana' }, { id: 'a', label: 'Apple' }, { id: 'c', label: 'cherry' }];
    expect(alphabeticalOptions(options).map(o => o.id)).toEqual(['a', 'b', 'c', 'z', 'other']);
    expect(alphabeticalOptions([{ label: 'other' }, { label: 'Zebra' }]).map(o => o.label)).toEqual(['Zebra', 'other']);
  });
  it('uses English collation for accented labels rather than character-code order', () => {
    expect(alphabeticalOptions([{ label: 'Zulu' }, { label: 'Éclair' }, { label: 'apple' }]).map(o => o.label)).toEqual(['apple', 'Éclair', 'Zulu']);
  });
  it('preserves source order, object identity, ids, hints and checklist ids for the real taxonomy', () => {
    const before = JSON.stringify(DEAL_CATEGORIES);
    for (const options of [DEAL_CATEGORIES, ...DEAL_CATEGORIES.map(c => c.subcategories)]) {
      const sorted = alphabeticalOptions<{ id: string; label: string }>(options);
      expect(sorted).not.toBe(options);
      expect(sorted.map(o => o.id).sort()).toEqual(options.map(o => o.id).sort());
      for (const option of sorted) expect(options.find(o => o.id === option.id)).toBe(option);
      if (sorted.length) expect(sorted.at(-1)?.label).toBe('Other');
      const labels = sorted.slice(0, -1).map(o => o.label);
      expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    }
    expect(JSON.stringify(DEAL_CATEGORIES)).toBe(before);
    expect(DEAL_CATEGORIES[0]?.id).toBe('electronics-computers');
  });
  it('handles empty lists and a lone fallback', () => {
    expect(alphabeticalOptions([])).toEqual([]);
    expect(alphabeticalOptions([{ id: 'other', label: 'Other' }])).toEqual([{ id: 'other', label: 'Other' }]);
  });
});
