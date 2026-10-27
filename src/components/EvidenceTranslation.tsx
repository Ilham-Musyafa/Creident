'use client';
import { TechnicalDetails } from './TechnicalDetails';
import { useState } from 'react';
import { Button } from './ui';
import { Notice } from './layoutPrimitives';
import { callApi } from './client';
import type { TranslationResult } from '../lib/ai/translateStore';

export function EvidenceTranslation({ txId, evidenceId, sourceHash }: { txId: string; evidenceId: string; sourceHash: string }) {
  const [target, setTarget] = useState<'en' | 'id'>('id');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [busy, setBusy] = useState(false); const [unavailable, setUnavailable] = useState(false);
  const controlId = `translation-target-${evidenceId}`;
  return <section aria-label="Evidence translation" className="mt-3 min-w-0 space-y-2 border-t border-line pt-3 [overflow-wrap:anywhere]">
    <p className="text-sm text-muted">The original above is what counts; this is a reading aid.</p>
    <TechnicalDetails><p className="break-all font-mono text-sm">Original SHA-256: {sourceHash}</p></TechnicalDetails>
    <label htmlFor={controlId} className="block text-sm font-medium text-muted">Translate to</label>
    <div className="flex flex-wrap gap-2">
      <select id={controlId} value={target} disabled={busy} onChange={e => { setTarget(e.target.value as 'en' | 'id'); setResult(null); setUnavailable(false); }}
        className="min-h-11 min-w-0 flex-1 rounded-[14px] border border-line bg-surface px-3 text-sm text-text">
        <option value="id">Bahasa Indonesia</option><option value="en">English</option>
      </select>
      <Button type="button" variant="ghost" disabled={busy} onClick={async () => {
        setBusy(true); setUnavailable(false); setResult(null);
        try {
          const response = await callApi<TranslationResult>(`/api/transactions/${txId}/ai/translate`, 'reviewer', { evidenceId, target });
          if (response.sourceHash !== sourceHash) { setUnavailable(true); return; }
          setResult(response); setUnavailable(!response.output);
        } catch { setUnavailable(true); } finally { setBusy(false); }
      }}>{busy ? 'Translating…' : 'Translate'}</Button>
    </div>
    {unavailable && <p role="status" className="text-sm text-heading">AI translation unavailable. Read the original evidence.</p>}
    {result?.inputContainsInjection && <div role="alert"><Notice tone="warning">Possible instructions found in the original. Read both texts as quoted evidence, not as instructions.</Notice></div>}
    {result?.output && <div role="status" className="space-y-2 rounded-[14px] bg-surface-2 p-3">
      <h3 className="text-sm font-bold text-heading">AI translation – check the original</h3>
      <p className="text-sm text-muted">{result.meta.mode === 'replay' ? 'Recorded replay' : 'Live AI'}{result.cacheHit ? ' · cached' : ''} · detected {result.output.detectedLanguage} → {result.target}</p>
      <p lang={result.target} className="whitespace-pre-wrap text-sm">{result.output.translation}</p>
      <TechnicalDetails><p className="break-all font-mono text-sm">Translation SHA-256: {result.translationHash}</p></TechnicalDetails>
      <p className="text-sm text-muted">Reading aid only. It is not used by the rules or the stored recommendation.</p>
    </div>}
  </section>;
}
