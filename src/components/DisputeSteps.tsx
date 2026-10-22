'use client';
// Opening a dispute in three short steps, like payment-app resolution centres:
// what went wrong -> what to prepare -> review and open (docs/UI.md).

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from './ui';
import { callApi, ErrorNote } from './client';
import { DISPUTE_TYPES, type DisputeTypeId } from '../lib/disputeTypes';

const STEPS = ['Problem', 'Prepare', 'Open'] as const;

export function DisputeSteps({ txId, evidenceWindow }: { txId: string; evidenceWindow?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<DisputeTypeId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const chosen = DISPUTE_TYPES.find((t) => t.id === type);

  async function open() {
    if (!type) return;
    setBusy(true); setError(null);
    try { await callApi(`/api/transactions/${txId}/dispute`, 'buyer', { type }); router.push(`/deals/${txId}/evidence`); }
    catch (e) { setError(e as Error); } finally { setBusy(false); }
  }

  return <section aria-label="Open a dispute" className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-bold text-heading">Something wrong?</h3>
      <ol aria-label={`Step ${step + 1} of ${STEPS.length}`} className="flex items-center gap-1.5">
        {STEPS.map((name, i) => <li key={name} title={name} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-heading' : i < step ? 'w-3 bg-heading/60' : 'w-3 bg-line'}`}/>)}
      </ol>
    </div>
    <p className="text-xs text-muted">Step {step + 1} of {STEPS.length}: {['What went wrong?', 'What you will need', 'Check and open'][step]}</p>

    {step === 0 && <fieldset className="space-y-2">
      <legend className="sr-only">What went wrong?</legend>
      {DISPUTE_TYPES.map((t) => <label key={t.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border px-3 text-sm ${type === t.id ? 'border-heading bg-surface-2 font-semibold text-heading' : 'border-line text-text'}`}>
        <input type="radio" name="dispute-type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} className="size-4"/>{t.label}
      </label>)}
      <Button variant="ghost" fullWidth disabled={!type} onClick={() => setStep(1)}>Next</Button>
    </fieldset>}

    {step === 1 && chosen && <div className="space-y-3">
      <p className="text-sm font-semibold text-heading">{chosen.label}: evidence that usually settles it</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-text">{chosen.buyer.map((b) => <li key={b}>{b}</li>)}</ul>
      <p className="text-xs text-muted">You describe each item as text in this demo.{evidenceWindow ? ` You will have ${evidenceWindow} to add it.` : ''}</p>
      <div className="grid grid-cols-2 gap-2"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button variant="ghost" onClick={() => setStep(2)}>Next</Button></div>
    </div>}

    {step === 2 && chosen && <div className="space-y-3">
      <dl className="rounded-[14px] bg-surface-2 p-3 text-sm">
        <div className="flex justify-between gap-3 py-1"><dt className="text-muted">Problem</dt><dd className="text-right font-semibold text-heading">{chosen.label}</dd></div>
        <div className="flex justify-between gap-3 py-1"><dt className="text-muted">Payment</dt><dd className="text-right font-semibold text-heading">Stays held</dd></div>
        <div className="flex justify-between gap-3 py-1"><dt className="text-muted">Next</dt><dd className="text-right font-semibold text-heading">Add your evidence</dd></div>
      </dl>
      <p className="text-xs text-muted">The seller can add evidence too. Rules recommend an outcome; a person decides unclear cases.</p>
      <div className="grid grid-cols-2 gap-2"><Button variant="ghost" disabled={busy} onClick={() => setStep(1)}>Back</Button><Button variant="strong" disabled={busy} onClick={open}>{busy ? 'Opening…' : 'Open dispute'}</Button></div>
    </div>}
    <ErrorNote error={error}/>
  </section>;
}
