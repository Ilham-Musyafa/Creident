import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TxStatus } from '../../../../lib/domain/types';
import CheckoutPage from './page';
import { redirect } from 'next/navigation';

const state = vi.hoisted(() => ({ role: 'buyer', status: 'DRAFT' as TxStatus }));
vi.mock('../../../_server', () => ({
  getRole: async () => state.role,
  isUuid: () => true,
  simulatedPayPal: () => true,
  data: () => ({ time: { shipByDays: 3, inspectionDays: 2 }, repo: {
    loadTransaction: () => ({ id: '550e8400-e29b-41d4-a716-446655440000', item: 'Test item', amount: '12.00', currency: 'USD', termsJson: '{}', status: state.status }),
    listAcceptances: () => [],
  } }),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  notFound: () => { throw new Error('not found'); },
}));
const id = '550e8400-e29b-41d4-a716-446655440000';
const open = () => CheckoutPage({ params: Promise.resolve({ id }) });
beforeEach(() => { state.role = 'buyer'; state.status = 'DRAFT'; vi.clearAllMocks(); });

describe('buyer checkout routing', () => {
  it.each(['AWAITING_APPROVAL', 'AUTHORIZED', 'SHIPPED', 'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'RETURN_REQUESTED', 'FROZEN_EXTERNAL', 'COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED', 'CANCELLED'] as const)('returns buyers to the deal at %s', async status => {
    state.status = status;
    await expect(open()).rejects.toThrow(`redirect:/deals/${id}`);
    expect(redirect).toHaveBeenCalledExactlyOnceWith(`/deals/${id}`);
  });
  it.each(['DRAFT', 'TERMS_LOCKED'] as const)('keeps checkout available at %s', async status => {
    state.status = status;
    expect(await open()).toBeDefined();
    expect(redirect).not.toHaveBeenCalled();
  });
  it.each(['seller', 'reviewer'])('keeps the existing %s view', async role => {
    state.role = role; state.status = 'IN_INSPECTION';
    expect(await open()).toBeDefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
