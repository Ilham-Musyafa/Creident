import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import EvidencePage from '../app/deals/[id]/evidence/page';

const fixture = vi.hoisted(() => ({ role: 'buyer', status: 'DISPUTED' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {}, push() {} }), useSearchParams: () => new URLSearchParams(), notFound() { throw new Error('Not found'); } }));
vi.mock('./layout', async () => ({ ...await import('./layoutPrimitives'), AppShell: ({ children }: { children: ReactNode }) => createElement('main', null, children) }));
vi.mock('../app/_server', () => ({
  getRole: async () => fixture.role, isUuid: () => true, sha256: () => 'fingerprint',
  data: () => ({ now: () => '2026-10-31T00:00:00Z', repo: {
    loadTransaction: () => ({ id: '12345678-1234-4234-8234-123456789abc', item: '[Demo] Camera', status: fixture.status, evidenceUntil: '2026-10-31T04:00:00Z' }),
    loadEvidence: () => [], readEvents: () => [{ type: 'OPEN_DISPUTE', payload: { disputeType: 'damaged' } }],
  } }),
}));
const render = async () => renderToStaticMarkup(await EvidencePage({ params: Promise.resolve({ id: '12345678-1234-4234-8234-123456789abc' }) }));

describe('Evidence clarity presentation', () => {
  it.each(['buyer', 'seller'])('keeps the %s form validation and presents guidance, writing, optional AI in order', async role => {
    fixture.role = role; fixture.status = 'DISPUTED';
    const html = await render();
    expect(html.indexOf('What to include')).toBeLessThan(html.indexOf('Write your evidence'));
    expect(html.indexOf('Write your evidence')).toBeLessThan(html.indexOf('Check with AI'));
    for (const text of ['Copy evidence code', 'Arrived damaged', 'This demo accepts text descriptions. Photo upload is not available yet.', '0 / 4000 characters', 'Nothing submitted yet', 'Due soon', 'Pasted chat excerpts are recorded as your own statement.']) expect(html).toContain(text);
    expect(html).toMatch(/<textarea[^>]*required=""[^>]*maxLength="4000"[^>]*rows="7"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Submit evidence<\/button>/);
  });
  it('keeps reviewers read-only', async () => {
    fixture.role = 'reviewer'; fixture.status = 'DISPUTED';
    const html = await render();
    expect(html).toContain('Reviewers do not add evidence.');
    expect(html).not.toContain('Submit evidence');
    expect(html).not.toContain('Check my evidence');
    expect(html).not.toContain('Due soon');
  });
  it('retains the closed-window gate and hides the AI check', async () => {
    fixture.role = 'buyer'; fixture.status = 'UNDER_REVIEW';
    const html = await render();
    expect(html).toContain('The evidence window is closed for this deal.');
    expect(html).not.toContain('Submit evidence');
    expect(html).not.toContain('Check my evidence');
  });
});
