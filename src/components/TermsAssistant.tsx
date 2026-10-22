'use client';
import { useState } from 'react';
import { Button } from './ui';
import { Notice } from './layout';
import { callApi } from './client';
import { TERMS_SAMPLES } from '../lib/ai/termsSamples';
import type { TermsDraft } from '../lib/ai/terms';
import type { AssistMeta } from '../lib/ai/assist';

export interface TermsDraftResponse {
  draft: TermsDraft | null; meta: AssistMeta; inputContainsInjection: boolean;
  receipt?: string; warning?: string; message?: string;
}
const unavailable = 'AI draft unavailable, fill the form manually';

export function TermsAssistant({ onApply, appliedReceipt }: { appliedReceipt: string | null; onApply: (result: TermsDraftResponse & { draft: TermsDraft; receipt: string }) => void }) {
  const [text, setText] = useState('');
  const [sample, setSample] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TermsDraftResponse | null>(null);
  const [error, setError] = useState('');
  const applied = appliedReceipt !== null && appliedReceipt === result?.receipt;
  // Collapsed by default so the item and price fields are visible first (owner request).
  return <details className="group min-w-0 rounded-[18px] border border-line bg-surface-2">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span id="terms-assist-title" className="block text-[15px] font-bold text-heading">Draft terms with AI · Optional</span>
        <span className="block text-xs text-muted">Paste a listing or chat; you check the draft before anything locks.</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180">⌄</span>
    </summary>
    <section aria-labelledby="terms-assist-title" className="min-w-0 space-y-3 border-t border-line p-4">
    <p className="text-xs leading-relaxed text-muted">The AI drafts the item, condition, included items and photo checks. Price stays manual. Use synthetic data for this demo; remove personal details before a live AI call.</p>
    <label htmlFor="listing-text" className="block text-xs font-medium text-muted">Listing or chat (maximum 4,000 characters)</label>
    <textarea id="listing-text" value={text} disabled={busy} maxLength={4000} rows={4} placeholder="Describe the item, condition and what is included…"
      className="w-full min-w-0 rounded-[14px] border border-line bg-surface px-4 py-3 text-sm text-text placeholder:text-muted"
      onChange={e => { setText(e.target.value); setResult(null); setError(''); }}/>
    <p className="text-right text-xs text-muted" aria-live="polite">{text.length}/4,000</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" disabled={busy} onClick={() => {
        setText(TERMS_SAMPLES[sample]!.text); setSample((sample + 1) % TERMS_SAMPLES.length); setResult(null); setError('');
      }}>Try a sample listing</Button>
      <Button type="button" variant="ghost" disabled={busy || !text.trim()} onClick={async () => {
        setBusy(true); setError(''); setResult(null);
        try { setResult(await callApi<TermsDraftResponse>('/api/ai/terms-draft', 'seller', { text })); }
        catch { setError(unavailable); } finally { setBusy(false); }
      }}>{busy ? 'Drafting…' : 'Generate draft'}</Button>
    </div>
    <p className="text-xs text-muted">The sample button alternates between a phone and a camera. Recorded drafts work without an API key.</p>
    {error && <p role="alert" className="text-sm text-heading">{error}</p>}
    {result?.inputContainsInjection && <div role="alert"><Notice tone="warning">{result.warning ?? 'Possible instructions found in the pasted text. Check the draft carefully.'}</Notice></div>}
    {result && !result.draft && <p role="status" className="text-sm text-heading">{unavailable}</p>}
    {result?.draft && <div className="min-w-0 space-y-3 text-sm [overflow-wrap:anywhere]">
      <p className="text-xs font-semibold text-muted">{result.meta.mode === 'replay' ? 'Recorded replay draft' : 'Live AI draft'} · nothing saved yet</p>
      <p className="font-semibold text-heading">{result.draft.item}</p><p>{result.draft.condition}</p>
      <div><h3 className="mb-1 font-semibold text-heading">Included items</h3><ul className="list-disc pl-5">{result.draft.includedItems.map(item => <li key={item}>{item}</li>)}</ul></div>
      <div><h3 className="mb-1 font-semibold text-heading">Photo checks</h3><ul className="list-disc pl-5">{result.draft.criteria.map(item => <li key={item}>{item}</li>)}</ul></div>
      <Button type="button" variant="ghost" fullWidth disabled={applied || !result.receipt} onClick={() => {
        if (!result.draft || !result.receipt) return;
        onApply({ ...result, draft: result.draft, receipt: result.receipt });
      }}>{applied ? 'Draft applied to the fields below' : 'Use draft in form'}</Button>
      <p role="status" className="text-xs text-muted">{applied ? 'Edit the fields below, then create the deal. The buyer still needs to accept.' : 'Using this draft replaces the item, condition, description, included items and checks below. Your price stays as entered.'}</p>
    </div>}
    </section>
  </details>;
}
