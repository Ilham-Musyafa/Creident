import type { StoredTx } from '../lib/repository';
import type { AuditEvent } from '../lib/audit/chain';
import { Notice } from './layout';
import { money } from './view';

export function PartialRefundNotice({ tx, events }: { tx: StoredTx; events: AuditEvent[] }) {
  if (!tx.partialRefundAmount || !['ready', 'pending'].includes(tx.partialRefundState ?? '')) return null;
  const error = [...events].reverse().find(e => e.type === 'PAYPAL_ERROR');
  return <div role="status" className="my-3 [overflow-wrap:anywhere]"><Notice tone="warning">
    <strong>{tx.captured ? 'Refund pending – payment completed' : 'Partial refund pending verification'}</strong>
    <span className="mt-1 block">The reviewer decided {money(tx.partialRefundAmount)}. Check the payment and the refund in PayPal before taking another money action. This prototype does not automatically retry or reconcile it.</span>
    {typeof error?.payload.debug_id === 'string' && <span className="mt-1 block font-mono text-xs">PayPal debug id: {error.payload.debug_id}</span>}
    {typeof error?.payload.requestId === 'string' && <span className="mt-1 block font-mono text-xs">Request id: {error.payload.requestId}</span>}
  </Notice></div>;
}
