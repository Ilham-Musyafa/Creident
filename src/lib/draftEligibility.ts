import type { TxStatus } from './domain/types';

export function canEditDraft(status: TxStatus, accepted: readonly string[]): boolean {
  return status === 'DRAFT' && !accepted.includes('buyer');
}
