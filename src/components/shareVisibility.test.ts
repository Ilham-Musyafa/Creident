import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DealPage from '../app/deals/[id]/page';
import type { TxStatus } from '../lib/domain/types';
const fixture = vi.hoisted(() => ({ role: 'seller', status: 'DRAFT' as TxStatus }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {}, push() {} }), useSearchParams: () => new URLSearchParams('created=1'), notFound() { throw new Error('Not found'); } }));
vi.mock('./layout', async () => ({ ...await import('./layoutPrimitives'), AppShell: ({ children }: { children: ReactNode }) => createElement('main', null, children) }));
vi.mock('../app/_server', () => ({
  getRole: async () => fixture.role, isUuid: () => true, simulatedPayPal: () => true, reviewerUnlocked: async () => true,
  data: () => ({ time: { evidenceDays: 2 }, now: () => '2026-10-31T00:00:00Z', repo: {
    loadTransaction: () => ({ id: '12345678-1234-4234-8234-123456789abc', item: '[Demo] Camera', amount: '50.00', currency: 'USD', captured: false, termsJson: '{}', status: fixture.status }),
    loadDecisions: () => [], loadRecommendation: () => null, listPayPalDisputes: () => [], readEvents: () => [], listAcceptances: () => [],
  } }),
}));
describe('Seller share card visibility already fixed in #137', () => {
  it.each(['DRAFT', 'TERMS_LOCKED', 'AWAITING_APPROVAL', 'AUTHORIZED', 'SHIPPED', 'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'COMPLETED', 'VOIDED', 'CANCELLED'] as TxStatus[])('depends on stored %s status even with created=1', async status => {
    fixture.role = 'seller'; fixture.status = status;
    const props = { params: Promise.resolve({ id: '12345678-1234-4234-8234-123456789abc' }), searchParams: Promise.resolve({ created: '1' }) };
    const html = renderToStaticMarkup(await DealPage(props));
    expect(html.includes('Share with the buyer')).toBe(['DRAFT', 'TERMS_LOCKED', 'AWAITING_APPROVAL'].includes(status));
  });
  it.each(['buyer', 'reviewer'])('does not show a seller share card to %s', async role => {
    fixture.role = role; fixture.status = 'DRAFT';
    const html = renderToStaticMarkup(await DealPage({ params: Promise.resolve({ id: '12345678-1234-4234-8234-123456789abc' }) }));
    expect(html).not.toContain('Share with the buyer');
  });
});

describe('Deal primary action presentation', () => {
  it.each([
    ['seller', 'AUTHORIZED', true], ['buyer', 'IN_INSPECTION', true], ['reviewer', 'UNDER_REVIEW', true],
    ['buyer', 'DISPUTED', true], ['seller', 'DISPUTED', true], ['buyer', 'RETURN_REQUESTED', true],
    ['seller', 'IN_INSPECTION', false], ['buyer', 'AUTHORIZED', false], ['reviewer', 'COMPLETED', false],
  ] as const)('%s / %s has one real primary control and no extra sticky copy', async (role, status, actionable) => {
    fixture.role = role; fixture.status = status;
    const html = renderToStaticMarkup(await DealPage({ params: Promise.resolve({ id: '12345678-1234-4234-8234-123456789abc' }) }));
    expect((html.match(/class="[^"]*deal-primary-action/g) ?? []).length).toBe(actionable ? 1 : 0);
    expect(html.includes('deal-hero-actions')).toBe(actionable);
    expect(html).not.toContain('deal-sticky-action');
    if (actionable) expect(html).toContain('lg:hidden');
  });
});
