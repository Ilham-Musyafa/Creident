import type { TxStatus } from '../lib/domain/types';
export type StatusIconName = 'clock' | 'progress' | 'problem' | 'check' | 'cancel';
export const STATUS_ICONS: Record<TxStatus, StatusIconName> = {
  DRAFT: 'clock', TERMS_LOCKED: 'clock', AWAITING_APPROVAL: 'clock', AUTHORIZED: 'progress',
  SHIPPED: 'progress', IN_INSPECTION: 'progress', RETURN_REQUESTED: 'progress',
  DISPUTED: 'problem', UNDER_REVIEW: 'problem', FROZEN_EXTERNAL: 'problem',
  COMPLETED: 'check', REFUNDED: 'check', PARTIALLY_REFUNDED: 'check', VOIDED: 'cancel', CANCELLED: 'cancel',
};
const paths: Record<StatusIconName, string> = {
  clock: 'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  progress: 'M4 8h15m-4-4 4 4-4 4 M20 16H5m4-4-4 4 4 4',
  problem: 'm12 3 10 18H2L12 3 M12 9v5m0 3v.1',
  check: 'm5 12 4 4L19 6', cancel: 'm6 6 12 12 M18 6 6 18',
};
export function StatusIcon({ status }: { status: TxStatus }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 shrink-0"><path d={paths[STATUS_ICONS[status]]}/></svg>;
}
