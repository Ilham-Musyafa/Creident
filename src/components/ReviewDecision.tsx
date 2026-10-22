'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui';
import { callApi, ErrorNote } from './client';
import { ReviewerCopilot } from './ReviewerCopilot';
const fieldClass = 'w-full min-h-11 min-w-0 rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted';
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted">{children}</label>;
}

export function ReviewDecision({ txId, pendingSplit, returnByDefault = true }: { txId: string; pendingSplit: boolean; returnByDefault?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState('');
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await work(); } catch (e) { setError(e as Error); } finally { setBusy(false); }
  }
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [requireReturn, setRequireReturn] = useState(returnByDefault);
  const decide = (outcome: 'RELEASE' | 'SPLIT' | 'REFUND') => run(async () => {
    await callApi(`/api/transactions/${txId}/review`, 'reviewer', { outcome, reason, ...(draftId ? { copilotDraftId: draftId } : {}), ...(outcome === 'REFUND' ? { requireReturn } : {}) });
    router.refresh();
  });
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
      <div><Label htmlFor="reason">Reviewer decision (reason required)</Label><textarea id="reason" rows={3} maxLength={2000} className={`${fieldClass} py-3`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write the reason for this decision…"/></div>
      <label htmlFor="require-return" className="flex min-h-11 items-start gap-3 text-sm">
        <input id="require-return" type="checkbox" className="mt-1 size-4" checked={requireReturn} onChange={(e) => setRequireReturn(e.target.checked)}/>
        <span><span className="font-semibold text-heading">Refund only after the item is returned</span><span className="block text-xs text-muted">Untick only when there is nothing to return, for example the item never arrived.</span></span>
      </label>
      {pendingSplit && <p className="text-xs text-muted">A split is recorded as pending: it moves no money until split payments are defined.</p>}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="ghost" disabled={disabled || pendingSplit} onClick={() => decide('RELEASE')}>Release</Button>
        <Button variant="ghost" disabled={disabled || pendingSplit} onClick={() => decide('SPLIT')}>Split</Button>
        <Button variant="strong" disabled={disabled || pendingSplit} onClick={() => decide('REFUND')}>Refund</Button>
      </div>
      <ErrorNote error={error}/>
    </div>
  );
}
