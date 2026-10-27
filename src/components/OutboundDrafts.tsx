'use client';
// AI assist #4 (DESIGN 6.1): drafts a person checks before anything leaves the app.

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { TechnicalDetails } from './TechnicalDetails';
import { Button } from './ui';
import { callApi, ErrorNote, ApiError } from './client';
import type { Role } from './view';

const fieldClass = 'w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-sm text-text placeholder:text-muted';

function AiLabel({ mode, injection }: { mode?: string; injection?: boolean }) {
  return <div className="space-y-2">
    <p className="inline-flex rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold text-heading">
      AI draft – check before you send{mode === 'replay' ? ' (recorded demo draft)' : ''}
    </p>
    {injection && <p role="note" className="text-sm" style={{ color: 'var(--warning-text)' }}>
      Some evidence text looks like an instruction to the AI. It was treated as data; read the draft carefully.
    </p>}
  </div>;
}

function Cited({ ids }: { ids: string[] }) {
  if (!ids.length) return <p className="text-sm text-muted">Cites no evidence item.</p>;
  return <TechnicalDetails><p className="text-sm text-muted">Cites evidence: {ids.map((id) => <span key={id} className="mr-1 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-heading">{id}</span>)}</p></TechnicalDetails>;
}

function useBusy() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await work(); } catch (e) { setError(e as Error); } finally { setBusy(false); }
  }
  return { busy, error, run };
}

type DraftResponse<T> = { draftId?: string; draft: T | null; mode?: string; inputContainsInjection?: boolean; message?: string };

/** Seller or reviewer: a message or evidence note for the PayPal case. */
export function PayPalMessageDraft({ txId, disputeId, role, evidenceStage }: { txId: string; disputeId: string; role: Role; evidenceStage: boolean }) {
  const router = useRouter();
  const { busy, error, run } = useBusy();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftResponse<{ message: string; citedEvidence: string[] }> | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  const ask = () => run(async () => {
    const result = await callApi<DraftResponse<{ message: string; citedEvidence: string[] }>>(`/api/transactions/${txId}/ai-drafts`, role, { feature: 'paypal-message' });
    setDraft(result); setText(result.draft?.message ?? ''); setOpen(true);
  });
  const send = () => run(async () => {
    const result = await callApi<{ message: string }>(`/api/transactions/${txId}/paypal-dispute/evidence`, role,
      { disputeId, note: text, ...(draft?.draftId ? { draftId: draft.draftId } : {}) });
    setStatus(result.message); setOpen(false); router.refresh();
  });

  if (!open) return <div className="space-y-2">
    <div className="grid gap-2 sm:grid-cols-2">
      <Button variant="ghost" disabled={busy} onClick={ask}>{busy ? 'Drafting…' : 'Draft a note with AI'}</Button>
      <Button variant="ghost" disabled={busy} onClick={() => { setDraft(null); setText(''); setOpen(true); }}>Write my own note</Button>
    </div>
    {status && <p role="status" className="text-sm text-heading">{status}</p>}
    <ErrorNote error={error}/>
  </div>;

  return <div className="space-y-3 rounded-[18px] border border-line bg-surface p-4">
    {draft?.draft ? <AiLabel mode={draft.mode} injection={draft.inputContainsInjection}/> : draft ? <p className="text-sm text-muted">{draft.message}</p> : null}
    <label htmlFor={`note-${disputeId}`} className="block text-sm font-medium text-muted">
      {evidenceStage ? 'Note sent with the evidence PDF' : 'Message to PayPal'}
    </label>
    <textarea id={`note-${disputeId}`} rows={7} maxLength={1500} className={fieldClass} value={text} onChange={(e) => setText(e.target.value)}
      placeholder="Stick to what the locked terms and evidence show."/>
    {draft?.draft && <Cited ids={draft.draft.citedEvidence}/>}
    <p className="text-sm text-muted">The app adds check values for the agreed terms and record under your text. {text.length}/1500</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
      <Button disabled={busy || text.trim().length < 20} onClick={send}>{busy ? 'Sending…' : evidenceStage ? 'Send evidence with this note' : 'Send message to PayPal'}</Button>
    </div>
    <ErrorNote error={error}/>
  </div>;
}

type ClaimDraft = { subject: string; claimedDamage: string; body: string; timeline: Array<{ when: string; event: string; evidence: string[] }>; attachments: string[]; citedEvidence: string[] };

/** Seller: a courier damage claim pack (PDF). Nothing is sent to a courier from this prototype. */
export function CourierClaimPack({ txId }: { txId: string }) {
  const router = useRouter();
  const { busy, error, run } = useBusy();
  const [draft, setDraft] = useState<DraftResponse<ClaimDraft> | null>(null);
  const [manual, setManual] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [done, setDone] = useState('');

  const ask = () => run(async () => {
    const result = await callApi<DraftResponse<ClaimDraft>>(`/api/transactions/${txId}/ai-drafts`, 'seller', { feature: 'courier-claim' });
    setDraft(result); setSubject(result.draft?.subject ?? ''); setBody(result.draft?.body ?? '');
    if (!result.draft) setManual(true);
  });
  const download = () => run(async () => {
    const res = await fetch(`/api/transactions/${txId}/courier-claim`, { method: 'POST',
      headers: { 'x-demo-role': 'seller', 'content-type': 'application/json' },
      body: JSON.stringify({ subject, body, ...(draft?.draftId ? { draftId: draft.draftId } : {}) }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string; message?: string };
      throw new ApiError(data.error ?? `HTTP_${res.status}`, data.message ?? 'Could not build the claim pack.');
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `courier-claim-${txId.slice(0, 8)}.pdf`; a.click();
    URL.revokeObjectURL(url);
    setDone('Claim pack downloaded and saved in the deal record. Send it to your courier yourself.');
    router.refresh();
  });

  const editing = !!draft?.draft || manual;
  let content: ReactNode;
  if (!editing) {
    content = <div className="grid gap-2 sm:grid-cols-2">
      <Button variant="ghost" disabled={busy} onClick={ask}>{busy ? 'Drafting…' : 'Draft courier claim with AI'}</Button>
      <Button variant="ghost" disabled={busy} onClick={() => setManual(true)}>Write it myself</Button>
    </div>;
  } else {
    content = <div className="space-y-3">
      {draft?.draft ? <AiLabel mode={draft.mode} injection={draft.inputContainsInjection}/> : draft?.message ? <p className="text-sm text-muted">{draft.message}</p> : null}
      <label htmlFor="claim-subject" className="block text-sm font-medium text-muted">Subject</label>
      <input id="claim-subject" maxLength={120} className={`${fieldClass} min-h-11 py-0`} value={subject} onChange={(e) => setSubject(e.target.value)}/>
      <label htmlFor="claim-body" className="block text-sm font-medium text-muted">Claim letter</label>
      <textarea id="claim-body" rows={9} maxLength={2500} className={fieldClass} value={body} onChange={(e) => setBody(e.target.value)}/>
      {draft?.draft && <>
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Timeline (each line cites recorded evidence)</p>
          <ul className="space-y-1 text-sm text-text">{draft.draft.timeline.map((t, i) => <li key={i}><span className="font-semibold text-heading">{t.when}:</span> {t.event} <TechnicalDetails><p className="font-mono text-sm text-muted">Evidence references: {t.evidence.join(', ')}</p></TechnicalDetails></li>)}</ul>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Attach</p>
          <ul className="list-disc pl-5 text-sm text-text">{draft.draft.attachments.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      </>}
      <p className="text-sm text-muted">The PDF includes the agreed terms, evidence and record checks. This demo does not contact couriers.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={busy} onClick={() => { setDraft(null); setManual(false); }}>Cancel</Button>
        <Button disabled={busy || subject.trim().length < 5 || body.trim().length < 20} onClick={download}>{busy ? 'Building…' : 'Download claim pack (PDF)'}</Button>
      </div>
    </div>;
  }
  return <section className="min-w-0 space-y-3" aria-label="Courier claim">
    <p className="text-sm text-muted">The buyer reported the item arrived damaged. If the courier may be at fault, prepare a claim for the courier.</p>
    {content}
    {done && <p role="status" className="text-sm text-heading">{done}</p>}
    <ErrorNote error={error}/>
  </section>;
}
