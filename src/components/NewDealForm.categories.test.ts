import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NewDealForm } from './NewDealForm';
import { categoryTerms, categoryChecklist } from '../lib/dealCategories';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

describe('New-deal category form contract', () => {
  it('requires a native category selection, hides dependent subcategory initially and retains price validation', () => {
    const html = renderToStaticMarkup(createElement(NewDealForm,{simulated:true,time:{shipByDays:3,inspectionDays:2,evidenceDays:2}}));
    expect(html).toMatch(/<select id="category" required=""/);
    expect(html).toContain('Choose a category'); expect(html).toContain('Item name');
    expect(html).not.toContain('id="subcategory"'); expect(html).not.toContain('Item type');
    expect(html).toContain('inputMode="decimal"'); expect(html).toContain('pattern="\\d{1,6}(\\.\\d{1,2})?"');
    const choices = (html.match(/<input\b[^>]*>/g) ?? []).filter(tag => tag.includes('type="radio"'));
    expect(choices).toHaveLength(4);
    for (const choice of choices) { expect(choice).toContain('name="condition"'); expect(choice).toContain('required=""'); }
    expect(html).not.toContain('<input id="condition"');
    for (const label of ['New', 'Used - Like New', 'Used - Good', 'Used - Good Enough']) expect(html).toContain(`value="${label}"`);
    expect(html).toContain('USD $');
    expect(html).toContain('Test price in USD. No real money moves.');
    expect(html).toContain('Not specified');
    expect(html).toContain('Not chosen');
    expect(html).toContain('>Category</dt>');
  });
  it('shows the Sandbox price helper', () => {
    const html = renderToStaticMarkup(createElement(NewDealForm,{simulated:false,time:{shipByDays:3,inspectionDays:2,evidenceDays:2}}));
    expect(html).toContain('Sandbox test price in USD.');
  });
  it('builds the exact category terms used by submission with editable, preserved checklist lines', () => {
    const merged = categoryChecklist('mobile-phones','mobile-phones-smartphones','My own check');
    const terms = {...categoryTerms('mobile-phones','mobile-phones-smartphones'),criteria:merged.criteria.split('\n')};
    expect(terms).toMatchObject({category:'mobile-phones',subcategory:'mobile-phones-smartphones'});
    expect(terms.criteria[0]).toBe('My own check'); expect(terms.criteria).toContain('Screen has no cracks');
    expect(categoryTerms('other','')).toEqual({category:'other'});
  });
});
