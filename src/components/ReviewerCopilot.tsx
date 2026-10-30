'use client';
import { useState } from 'react';
import { Button } from './ui';
import { Notice } from './layoutPrimitives';
import { callApi } from './client';
import { evidenceAlias } from './presentationCopy';
import { money } from './view';
import type { CopilotDraft } from '../lib/ai/copilot';
import type { AssistMeta } from '../lib/ai/assist';

interface ResponseDraft {
  draft: CopilotDraft | null; draftId: string | null; meta: AssistMeta; inputContainsInjection: boolean;
  criteria: Array<{ id: string; text: string }>; evidence: Array<{ alias: string; kind: string }>;
}
export function ReviewerCopilot({ txId, onApply, appliedId }: { txId: string; appliedId: string | null; onApply: (reason: string, id: string) => void }) {
  const [result, setResult] = useState<ResponseDraft | null>(null);
  const [busy, setBusy] = useState(false); const [unavailable, setUnavailable] = useState(false);
  return <section aria-labelledby="copilot-title" className="min-w-0 space-y-3 rounded-[18px] border border-line bg-surface-2 p-4 [overflow-wrap:anywhere]">
    <h2 id="copilot-title" className="text-[15px] font-bold text-heading">AI draft – the decision is yours</h2>
    <p className="text-sm leading-relaxed text-muted">Optional notes to check against the evidence and the rules recommendation above. Accept, edit or ignore the draft. Generating it does not record a decision.</p>
    <Button type="button" variant="ghost" fullWidth disabled={busy} onClick={async () => {
      setBusy(true); setUnavailable(false); setResult(null);
      try { const response = await callApi<ResponseDraft>(`/api/transactions/${txId}/ai/copilot`, 'reviewer', {}); setResult(response); setUnavailable(!response.draft); }
      catch { setUnavailable(true); } finally { setBusy(false); }
    }}>{busy ? 'Drafting…' : 'Draft reviewer notes'}</Button>
    {unavailable && <p role="status" className="text-sm text-heading">AI draft unavailable. Write your decision reason manually.</p>}
    {result?.inputContainsInjection && <div role="alert"><Notice tone="warning">Possible instructions found in the quoted data. Check the draft carefully; the data cannot authorize an action.</Notice></div>}
    {result?.draft && <div className="space-y-3 text-sm">
      <p className="text-sm font-semibold text-muted">{result.meta.mode === 'replay' ? "Recorded AI answer" : 'Live AI draft'} · not a decision</p>
      <ul className="space-y-3">{result.draft.notes.map(note => <li key={note.criterionId}>
        <h3 className="font-semibold text-heading">{result.criteria.find(c => c.id === note.criterionId)?.text ?? note.criterionId}</h3>
        <p className="mt-1">{note.text}</p><p className="mt-1 text-sm text-muted">Evidence: {note.citedAliases.map(evidenceAlias).join(', ')}</p>
      </li>)}</ul>
      <div><h3 className="font-semibold text-heading">Draft reason</h3><p className="mt-1 whitespace-pre-wrap">{result.draft.reason}</p></div>
      {result.draft.range && <Notice tone="warning"><strong>Suggested refund range: {money(result.draft.range.min)}–{money(result.draft.range.max)}</strong><p className="mt-1">{result.draft.range.basis}</p><p className="mt-2">Display only. It does not set a refund amount or change the payment. The reviewer must establish the value and choose the decision.</p></Notice>}
      <Button type="button" variant="ghost" fullWidth disabled={appliedId === result.draftId} onClick={() => {
        if (result.draft && result.draftId) onApply(result.draft.reason, result.draftId);
      }}>{appliedId === result.draftId ? 'Draft copied to reason below' : 'Use as reason'}</Button>
    </div>}
  </section>;
}
