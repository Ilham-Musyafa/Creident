'use client';
import { validPartialAmount } from '../lib/partialAmount';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui';
import { callApi, ErrorNote } from './client';
import { ReviewerCopilot } from './ReviewerCopilot';
import { ConfirmSheet, type ConfirmDetails } from './ConfirmSheet';
const fieldClass = 'w-full min-h-11 min-w-0 rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted';
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-muted">{children}</label>;
}

export function ReviewDecision({ txId, pendingSplit, returnByDefault = true, dealAmount }: { txId: string; pendingSplit: boolean; returnByDefault?: boolean; dealAmount: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState('');
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await work(); } catch (e) { setError(e as Error); } finally { setBusy(false); router.refresh(); }
  }
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [requireReturn, setRequireReturn] = useState(returnByDefault);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialRequireReturn, setPartialRequireReturn] = useState(false);
  type Outcome = 'RELEASE' | 'SPLIT' | 'REFUND' | 'PARTIAL_REFUND';
  const [pending, setPending] = useState<Outcome | null>(null);
  const decide = (outcome: Outcome) => run(async () => {
    await callApi(`/api/transactions/${txId}/review`, 'reviewer', { outcome, reason, ...(draftId ? { copilotDraftId: draftId } : {}), ...(outcome === 'REFUND' ? { requireReturn } : outcome === 'PARTIAL_REFUND' ? { amount: partialAmount, requireReturn: partialRequireReturn } : {}) });
    setPending(null);
    router.refresh();
  });
  // What each decision does to the money, shown before the reviewer confirms (docs/UI.md).
  const usd = (v: string) => `$${Number(v).toFixed(2)}`;
  const confirmFor = (outcome: Outcome): ConfirmDetails => ({
    RELEASE: { title: 'Release the payment to the seller', amount: usd(dealAmount), rows: [{ label: 'PayPal', value: 'Charge the approved payment' }, { label: 'Buyer', value: 'No refund' }], confirmLabel: 'Confirm release' },
    REFUND: { title: 'Refund the buyer', amount: usd(dealAmount), tone: 'strong' as const, rows: [{ label: 'When', value: requireReturn ? 'After the item is returned' : 'Now' }, { label: 'PayPal', value: 'Cancel the payment, or refund if already charged' }, { label: 'Fee', value: 'Borne by the platform' }], confirmLabel: 'Confirm refund' },
    PARTIAL_REFUND: { title: 'Partial refund to the buyer', amount: validPartialAmount(partialAmount, dealAmount) ? usd(partialAmount) : '', amountCaption: `of ${usd(dealAmount)}`, rows: [{ label: 'Seller keeps', value: validPartialAmount(partialAmount, dealAmount) ? usd(String(Number(dealAmount) - Number(partialAmount))) : '—' }, { label: 'When', value: partialRequireReturn ? 'After the item is returned' : 'Now' }, { label: 'PayPal', value: 'Charge, then refund this amount' }], confirmLabel: 'Confirm partial refund' },
    SPLIT: { title: 'Record a split decision', rows: [{ label: 'Money', value: 'Does not move yet' }], note: 'A split is recorded as pending until split payments are defined.', confirmLabel: 'Record split' },
  } satisfies Record<Outcome, ConfirmDetails>)[outcome];
  const disabled = busy || reason.trim().length < 2;
  return (
    <div className="space-y-3">
      <fieldset disabled={busy} className="min-w-0"><ReviewerCopilot txId={txId} appliedId={draftId} onApply={(text, id) => {
        if (!draftId) setManualReason(reason);
        setReason(text); setDraftId(id); setError(null);
      }}/></fieldset>
      {draftId && <Button type="button" variant="ghost" fullWidth disabled={busy} onClick={() => {
        setReason(manualReason); setDraftId(null); setError(null);
      }}>Discard draft reason</Button>}
      <div><Label htmlFor="reason">Reviewer decision (reason required)</Label><textarea id="reason" disabled={busy} rows={3} maxLength={2000} className={`${fieldClass} py-3`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write the reason for this decision…"/></div>
      <label htmlFor="require-return" className="flex min-h-11 items-start gap-3 text-sm">
        <input id="require-return" disabled={busy} type="checkbox" className="mt-1 size-4" checked={requireReturn} onChange={(e) => setRequireReturn(e.target.checked)}/>
        <span><span className="font-semibold text-heading">Refund only after the item is returned</span><span className="block text-sm text-muted">Untick only when there is nothing to return, for example the item never arrived.</span></span>
      </label>
      {pendingSplit && <p className="text-sm text-muted">A split is recorded as pending: it moves no money until split payments are defined.</p>}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="ghost" disabled={disabled || pendingSplit} onClick={() => setPending('RELEASE')}>Release</Button>
        <Button variant="ghost" disabled={disabled || pendingSplit} onClick={() => setPending('SPLIT')}>Split</Button>
        <Button variant="strong" disabled={disabled || pendingSplit} onClick={() => setPending('REFUND')}>Refund</Button>
      </div>
      <section aria-label="Partial refund decision" className="space-y-3 rounded-[18px] border border-line p-3">
        <h3 className="text-sm font-bold text-heading">Partial refund</h3>
        <p className="text-sm text-muted">Charge the full payment, then refund the amount you enter. Any AI range is advice only. The platform bears the fee on the refunded part; no seller payout is implemented.</p>
        <div><Label htmlFor="partial-amount">Partial refund amount (USD)</Label><input id="partial-amount" disabled={busy} className={fieldClass} inputMode="decimal" value={partialAmount} maxLength={10} placeholder="e.g. 10.00" onChange={e => setPartialAmount(e.target.value)}/></div>
        <p className="text-sm text-muted">Enter two decimals, above zero and below {dealAmount} USD. The amount is never filled from an AI draft.</p>
        <label htmlFor="partial-return" className="flex min-h-11 items-start gap-3 text-sm"><input id="partial-return" disabled={busy} type="checkbox" className="mt-1 size-4" checked={partialRequireReturn} onChange={e => setPartialRequireReturn(e.target.checked)}/><span>Require the item returned before this partial refund</span></label>
        <Button variant="ghost" fullWidth disabled={disabled || pendingSplit || !validPartialAmount(partialAmount, dealAmount)} onClick={() => setPending('PARTIAL_REFUND')}>Partial refund</Button>
        <p className="text-sm text-muted">Partial refund executes the typed amount. Split only records a pending decision and moves no money.</p>
      </section>
      {pending && <ConfirmSheet open details={{ ...confirmFor(pending), note: <>{confirmFor(pending).note ? <>{confirmFor(pending).note} </> : null}Reason: “{reason.trim().slice(0, 140)}{reason.trim().length > 140 ? '…' : ''}”</> }} busy={busy} onConfirm={() => { const outcome = pending; setPending(null); void decide(outcome); }} onCancel={() => setPending(null)}/>}
      <ErrorNote error={error}/>
    </div>
  );
}
