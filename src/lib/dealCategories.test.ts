import { describe, it, expect } from 'vitest';
import { DEAL_CATEGORIES, resolveDealCategory, categoryTerms, categoryChecklist } from './dealCategories';
import { TERMS_TEMPLATES } from './termsTemplates';

describe('Deal category taxonomy', () => {
  it('has 18 ordered stable categories, globally unique slugs and a final Other in each nonempty list', () => {
    expect(DEAL_CATEGORIES).toHaveLength(18);
    expect(DEAL_CATEGORIES[0]!.label).toBe('Electronics & Computers');
    expect(DEAL_CATEGORIES.at(-1)).toMatchObject({ id: 'other', subcategories: [] });
    const ids = DEAL_CATEGORIES.flatMap(c => [c.id, ...c.subcategories.map(s => s.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true);
    for (const c of DEAL_CATEGORIES.slice(0, -1)) expect(c.subcategories.at(-1)?.label).toBe('Other');
    expect(DEAL_CATEGORIES[2]!.hint).toBe('Physical items only');
  });
  it.each([['phone','Mobile Phones','Smartphones'],['laptop','Electronics & Computers','Laptops'],['camera','Electronics & Computers','Cameras'],['audio','Electronics & Computers','Headphones & Speakers'],['console','Video Games & Consoles','Consoles']])('reads legacy %s without mutating it', (legacy, category, subcategory) => {
    const result = resolveDealCategory(legacy);
    expect(result.category.label).toBe(category); expect(result.subcategory?.label).toBe(subcategory);
  });
  it.each(['', 'unknown', undefined, null])('maps missing/unknown categories to Other: %s', value => {
    expect(resolveDealCategory(value)).toMatchObject({ category: { id: 'other' }, subcategory: undefined });
  });
  it('does not attach a subcategory from another category', () => {
    expect(categoryTerms('books','mobile-phones-smartphones')).toEqual({category:'books'});
    expect(categoryTerms('other','books-fiction')).toEqual({category:'other'});
    expect(categoryTerms('books','books-fiction')).toEqual({category:'books',subcategory:'books-fiction'});
  });
  it('attaches exactly the five existing checklists, preserving custom lines and avoiding duplicates', () => {
    const attached = DEAL_CATEGORIES.flatMap(c => c.subcategories.filter(s => s.templateId).map(s => ({c,s})));
    expect(attached).toHaveLength(5);
    expect(attached.map(x=>x.s.templateId).sort()).toEqual(['audio','camera','console','laptop','phone']);
    for(const {c,s} of attached) {
      const first = categoryChecklist(c.id,s.id,'Seller custom check');
      expect(first.added).toBe(true); expect(first.criteria.split('\n')[0]).toBe('Seller custom check');
      for(const line of TERMS_TEMPLATES.find(t=>t.id===s.templateId)!.criteria) expect(first.criteria).toContain(line);
      expect(categoryChecklist(c.id,s.id,first.criteria).criteria).toBe(first.criteria);
    }
    expect(categoryChecklist('books','books-fiction','Seller custom check')).toEqual({criteria:'Seller custom check',added:false});
  });
});
