'use client';
import { useState } from 'react';
import { Button } from './ui';
import { Notice } from './layoutPrimitives';
import { callApi } from './client';
import type { ChecklistItem, CompletenessCheck, EvidenceSide } from '../lib/ai/evidenceCheck';
import type { AssistMeta } from '../lib/ai/assist';

interface CheckResponse {
  output: CompletenessCheck | null;
  checklist?: ChecklistItem[];
  evidence?: Array<{ alias: string; kind: string }>;
  meta?: AssistMeta;
  inputContainsInjection?: boolean;
}
const unavailable = 'AI check unavailable. You can still add evidence using the guidance above.';
const labels = { covered: 'Covered', missing: 'Missing', unclear: 'Unclear' };

export function EvidenceCompleteness({ txId, side }: { txId: string; side: EvidenceSide }) {
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ran, setRan] = useState(false);
  return <section aria-labelledby="evidence-check-title" className="min-w-0 space-y-3 rounded-[18px] border border-line bg-surface-2 p-4 [overflow-wrap:anywhere]">
    <h2 id="evidence-check-title" className="text-[15px] font-bold text-heading">AI check – what your evidence may still be missing</h2>
    <p className="text-sm leading-relaxed text-muted">Optional, for your evidence only. Checks text descriptions against the agreed checklist; it does not inspect photos or say who is right. It is not sent to the rules engine or reviewer recommendation.</p>
    <p className="text-sm text-muted">One check now, then another after each new evidence item. The deadline stays the same. You can always submit evidence without a check.</p>
    <Button type="button" variant="ghost" fullWidth disabled={busy || ran} onClick={async () => {
      setBusy(true); setMessage(''); setResult(null);
      try {
        const response = await callApi<CheckResponse>(`/api/transactions/${txId}/ai/evidence-check`, side, {});
        setResult(response); setRan(true);
        if (!response.output) setMessage(unavailable);
      } catch (error) {
        // callApi exposes only the server's plain public message, not provider errors.
        setMessage(error instanceof Error && error.message.startsWith('Add a new evidence item') ? error.message : unavailable);
      } finally { setBusy(false); }
    }}>{busy ? 'Checking…' : ran ? 'Checked for these evidence items' : 'Check my evidence'}</Button>
    {message && <p role="status" className="text-sm text-heading">{message}</p>}
    {result?.inputContainsInjection && <div role="alert"><Notice tone="warning">Possible instructions found in the quoted data. Check the suggestions carefully; the text cannot authorize an action.</Notice></div>}
    {result?.output && <div className="space-y-3 text-sm" role="status">
      <p className="text-sm font-semibold text-muted">{result.meta?.mode === 'replay' ? 'Recorded replay check' : 'Live AI check'} · advisory only</p>
      <ul className="space-y-3">{result.output.checks.map(entry => <li key={entry.criterionId}>
        <p className="font-semibold text-heading">{labels[entry.status]} · {result.checklist?.find(c => c.id === entry.criterionId)?.text ?? entry.criterionId}</p>
        {entry.citedAliases.length > 0 && <p className="mt-1 text-sm text-muted">Your evidence: {entry.citedAliases.map(alias => `${alias} (${result.evidence?.find(e => e.alias === alias)?.kind ?? 'evidence'})`).join(', ')}</p>}
      </li>)}</ul>
      {result.output.suggestions.length > 0 && <div><h3 className="font-semibold text-heading">What you could add</h3><ul className="mt-1 list-disc space-y-1 pl-5">{result.output.suggestions.map(s => <li key={s}>{s}</li>)}</ul></div>}
      <p className="text-sm text-muted">Covered means a relevant description was cited, not that the claim was proven. This result is not saved as a recommendation.</p>
    </div>}
  </section>;
}
