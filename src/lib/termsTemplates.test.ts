import { describe, expect, it } from 'vitest';
import { mergeCriteria, TERMS_TEMPLATES } from './termsTemplates';

describe('terms templates', () => {
  const phone = TERMS_TEMPLATES.find((t) => t.id === 'phone')!;
  it('fills an empty checklist', () => {
    expect(mergeCriteria('', phone).split('\n')).toEqual(phone.criteria);
  });
  it('keeps the seller lines first and skips duplicates, ignoring case', () => {
    const merged = mergeCriteria('Box included\nscreen has no cracks', phone).split('\n');
    expect(merged[0]).toBe('Box included');
    expect(merged.filter((l) => l.toLowerCase() === 'screen has no cracks')).toHaveLength(1);
    expect(merged).toHaveLength(1 + phone.criteria.length);
  });
  it('every template has unique ids and short checks that fit the API limits', () => {
    expect(new Set(TERMS_TEMPLATES.map((t) => t.id)).size).toBe(TERMS_TEMPLATES.length);
    for (const t of TERMS_TEMPLATES) expect(t.criteria.join('\n').length).toBeLessThan(1500);
  });
});
