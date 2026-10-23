'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui';
import { Card, Notice } from './layout';
import { TermsListEditor } from './TermsListEditor';
import { callApi, ErrorNote } from './client';
import { TermsAssistant } from './TermsAssistant';
import { mergeCriteria, TERMS_TEMPLATES } from '../lib/termsTemplates';

import { descriptionForDraft } from '../lib/ai/termsFields';

const fieldClass = 'min-h-11 w-full rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted';
function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-muted">{children}{hint && <span className="ml-1 font-normal">({hint})</span>}</label>;
}

export function NewDealForm({ time }: { time: { shipByDays: number; inspectionDays: number; evidenceDays: number } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [form, setForm] = useState({ item: '', amount: '', condition: '', description: '', criteria: '', category: '', includedItems: '' });
  const [manualFields, setManualFields] = useState<typeof form | null>(null);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const criteria = form.criteria.split('\n').map((c) => c.trim()).filter(Boolean);
      const amount = Number(form.amount).toFixed(2);
      const includedItems = form.includedItems.split('\n').map(item => item.trim()).filter(Boolean);
      const created = await callApi<{ transaction: { id: string } }>('/api/transactions', 'seller', {
        item: form.item, amount, ...(receipt ? { termsDraftReceipt: receipt } : {}),
        terms: { condition: form.condition, description: form.description, ...(includedItems.length ? { includedItems } : {}), ...(form.category ? { category: form.category } : {}), ...(criteria.length ? { criteria } : {}) },
      });
      // The seller accepts their own terms right away; the buyer accepts on the checkout screen.
      await callApi(`/api/transactions/${created.transaction.id}/accept`, 'seller', {});
      router.push(`/deals/${created.transaction.id}?created=1`);
    } catch (error) { setError(error as Error); } finally { setBusy(false); }
  }

  const includedCount = form.includedItems.split('\n').filter(line => line.trim()).length;
  const criteriaCount = form.criteria.split('\n').filter(line => line.trim()).length;
  const amountPreview = /^\d{1,6}(\.\d{1,2})?$/.test(form.amount) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(form.amount)) : '—';

  return (
    <form onSubmit={submit} className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-w-0 space-y-6 p-5 sm:p-6">
      <TermsAssistant appliedReceipt={receipt} onApply={({ draft, receipt: draftReceipt }) => {
        if (!receipt) setManualFields(form);
        setForm(current => ({ ...current, item: draft.item, condition: draft.condition,
          description: descriptionForDraft(draft), includedItems: draft.includedItems.join('\n'), criteria: draft.criteria.join('\n'), category: '' }));
        setReceipt(draftReceipt);
      }}/>
      {receipt && <div className="space-y-2"><p className="text-sm text-muted">AI draft applied. Check and edit every field before sharing.</p><Button type="button" variant="ghost" onClick={() => {
        if (manualFields) setForm(current => ({ ...manualFields, amount: current.amount }));
        setReceipt(null);
      }}>Continue with manual terms</Button><p className="text-sm text-muted">Restores your fields from before the draft; your entered price is kept.</p></div>}
      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-4 text-base font-bold text-heading">Item details</legend>
      <div><Label htmlFor="item">Item</Label><input id="item" required maxLength={200} className={fieldClass} placeholder="Used phone, 128 GB" value={form.item} onChange={set('item')}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="amount">Price (USD)</Label><input id="amount" required inputMode="decimal" pattern="\d{1,6}(\.\d{1,2})?" className={fieldClass} placeholder="120.00" value={form.amount} onChange={set('amount')}/></div>
        <div><Label htmlFor="condition">Condition</Label><input id="condition" required maxLength={120} className={fieldClass} placeholder="Good" value={form.condition} onChange={set('condition')}/></div>
      </div>
      <div><Label htmlFor="description">Description</Label><textarea id="description" required maxLength={1000} rows={3} className={`${fieldClass} py-3`} placeholder="What is included, known flaws" value={form.description} onChange={set('description')}/></div>
      </fieldset>
      <fieldset className="min-w-0 space-y-3 border-t border-line pt-5">
        <legend className="pr-2 text-base font-bold text-heading">What’s included</legend>
        <p className="text-sm leading-relaxed text-muted">Optional. List the accessories and parts the buyer should receive.</p>
        <TermsListEditor id="included-items" label="Item" value={form.includedItems} maxLength={1000} placeholder="e.g. Charging cable" onChange={value => setForm(current => ({ ...current, includedItems: value }))}/>
      </fieldset>
      <fieldset className="min-w-0 space-y-4 border-t border-line pt-5">
        <legend className="pr-2 text-base font-bold text-heading">Buyer checks</legend>
        <p className="text-sm leading-relaxed text-muted">Optional. Add specific checks the buyer can support with a photo or short video.</p>
      <div>
        <Label htmlFor="category" hint="optional">Item type</Label>
        <select id="category" className={fieldClass} value={form.category} onChange={(e) => {
          const template = TERMS_TEMPLATES.find((t) => t.id === e.target.value);
          setForm({ ...form, category: e.target.value, criteria: template ? mergeCriteria(form.criteria, template) : form.criteria });
        }}>
          <option value="">Other (write your own checks)</option>
          {TERMS_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}: add its checklist</option>)}
        </select>
      </div>
      <TermsListEditor id="criteria" label="Check" value={form.criteria} maxLength={1500} placeholder="e.g. Screen has no cracks" onChange={value => setForm(current => ({ ...current, criteria: value }))}/>
      </fieldset>
      </Card>

      <aside aria-label="Transaction summary" className="min-w-0 space-y-3 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2">
        <Card className="min-w-0 space-y-4 p-5">
          <h2 className="text-base font-bold text-heading">Transaction summary</h2>
          <div className="border-b border-line pb-4">
            <p className="break-words text-sm font-semibold text-heading">{form.item.trim() || 'Your item'}</p>
            <p className="mt-2 break-words text-3xl font-bold tabular-nums text-heading">{amountPreview}</p>
            <p className="mt-1 text-sm text-muted">USD · Sandbox demo</p>
          </div>
          <dl className="space-y-3 text-sm">
            {[
              ['Condition', form.condition.trim() || 'Not specified'],
              ['Included items', String(includedCount)], ['Buyer checks', String(criteriaCount)],
              ['Seller ships within', `${time.shipByDays} days`],
              ['Buyer inspection', `${time.inspectionDays} days`],
              ['Evidence window', `${time.evidenceDays} days`],
            ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4"><dt className="text-muted">{label}</dt><dd className="min-w-0 max-w-[60%] break-words text-right font-semibold text-heading">{value}</dd></div>)}
          </dl>
          <details className="border-t border-line pt-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-heading">Fees & refunds</summary>
            <p className="pb-2 text-sm leading-relaxed text-muted">PayPal fees are shown after payment and are not returned on a refund. The platform bears those fees, so the buyer receives the full refund amount.</p>
          </details>
        </Card>
        <Notice>Demo payments only. No real money moves.</Notice>
      </aside>

      <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
        <Button type="submit" fullWidth disabled={busy}>{busy ? 'Creating…' : 'Create deal link'}</Button>
        <p className="text-center text-sm leading-relaxed text-muted">Creates a draft to share with the buyer. Terms lock after both parties accept.</p>
        <ErrorNote error={error}/>
      </div>
    </form>
  );
}
