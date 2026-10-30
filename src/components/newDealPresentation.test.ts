import { describe, expect, it } from 'vitest';
import { CONDITION_OPTIONS, categorySummary, conditionFromDraft, priceHelper } from './newDealPresentation';

describe('New deal presentation', () => {
  it('offers the four approved condition labels in order', () => {
    expect(CONDITION_OPTIONS).toEqual(['New', 'Used - Like New', 'Used - Good', 'Used - Good Enough']);
  });

  it.each([
    ['New', 'New'],
    ['Used - Like New', 'Used - Like New'],
    ['Used - Good', 'Used - Good'],
    ['Used - Good Enough', 'Used - Good Enough'],
    ['like new, light wear', 'Used - Like New'],
    ['GOOD ENOUGH with scratches', 'Used - Good Enough'],
    ['New, sealed', 'New'],
    ['Good; small scratch', 'Used - Good'],
    ['Excellent condition', ''],
  ])('maps AI condition %s to %s', (draft, expected) => {
    expect(conditionFromDraft(draft)).toBe(expected);
  });

  it('uses the category labels in the summary without changing stored IDs', () => {
    expect(categorySummary('', '')).toBe('Not chosen');
    expect(categorySummary('mobile-phones', 'mobile-phones-smartphones')).toBe('Mobile Phones / Smartphones');
    expect(categorySummary('other', '')).toBe('Other');
  });

  it('shows the correct price explanation for each mode', () => {
    expect(priceHelper(true)).toBe('Test price in USD. No real money moves.');
    expect(priceHelper(false)).toBe('Sandbox test price in USD.');
  });
});
