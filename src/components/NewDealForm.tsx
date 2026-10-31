'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui';
import { Card, Notice } from './layoutPrimitives';
import { TermsListEditor } from './TermsListEditor';
import { callApi, ErrorNote } from './client';
import { TermsAssistant } from './TermsAssistant';
import { alphabeticalOptions } from './categoryOptions';
import { DEAL_CATEGORIES, categoryChecklist, categoryTerms } from '../lib/dealCategories';
import { CONDITION_OPTIONS, categorySummary, conditionFromDraft, priceHelper } from './newDealPresentation';

import { descriptionForDraft } from '../lib/ai/termsFields';

const fieldClass = 'min-h-11 w-full rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted';
function Label({ htmlFor, children, hint, required = false }: { htmlFor: string; children: ReactNode; hint?: string; required?: boolean }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-muted">{children}{required && <><span aria-hidden="true"> *</span><span className="sr-only"> required</span></>}{hint && <span className="ml-1 font-normal">({hint})</span>}</label>;
}

export function NewDealForm({ time, simulated }: { simulated: boolean; time: { shipByDays: number; inspectionDays: number; evidenceDays: number } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [form, setForm] = useState({ item: '', amount: '', condition: '', description: '', criteria: '', category: '', subcategory: '', includedItems: '' });
  const [checklistAdded, setChecklistAdded] = useState(false);
  const [draftConditionText, setDraftConditionText] = useState<string | null>(null);
  const selectedCategory = DEAL_CATEGORIES.find(c => c.id === form.category);
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
        terms: { condition: form.condition, description: form.description, ...(includedItems.length ? { includedItems } : {}), ...categoryTerms(form.category, form.subcategory), ...(criteria.length ? { criteria } : {}) },
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
        const condition = conditionFromDraft(draft.condition);
        setDraftConditionText(condition ? null : draft.condition);
        setForm(current => ({ ...current, item: draft.item, condition,
          description: descriptionForDraft(draft), includedItems: draft.includedItems.join('\n'), criteria: draft.criteria.join('\n'), category: '', subcategory: '' }));
        setChecklistAdded(false);
        setReceipt(draftReceipt);
      }}/>
      {receipt && <div className="space-y-2"><p className="text-sm text-muted">AI draft applied. Check and edit every field before sharing.</p><Button type="button" variant="ghost" onClick={() => {
        if (manualFields) setForm(current => ({ ...manualFields, amount: current.amount }));
        setDraftConditionText(null);
        setReceipt(null);
      }}>Continue with manual terms</Button><p className="text-sm text-muted">Restores your fields from before the draft; your entered price is kept.</p></div>}
      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-4 text-base font-bold text-heading">Item details</legend>
      <div><Label htmlFor="item" required>Item name</Label><input id="item" required maxLength={200} className={fieldClass} value={form.item} onChange={set('item')}/></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="amount" required>Price (USD)</Label><div className="relative"><span aria-hidden="true" className="pointer-events-none absolute left-4 top-3 text-sm font-medium text-muted">USD $</span><input id="amount" required inputMode="decimal" pattern="\d{1,6}(\.\d{1,2})?" className={`${fieldClass} pl-20!`} value={form.amount} onChange={set('amount')}/></div><p className="mt-2 text-sm text-muted">{priceHelper(simulated)}</p></div>
        <fieldset className="min-w-0 sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-muted">Condition<span aria-hidden="true"> *</span><span className="sr-only"> required</span></legend>
          <div className="grid grid-cols-2 items-stretch gap-2 lg:grid-cols-4">
            {CONDITION_OPTIONS.map((option, index) => <label key={option} className="condition-choice relative block min-w-0 cursor-pointer">
              <input id={`condition-${index}`} type="radio" name="condition" aria-label={option} required value={option} checked={form.condition === option} onChange={e => { setForm(current => ({ ...current, condition: e.target.value })); setDraftConditionText(null); }} className="peer sr-only"/>
              <span className="flex h-full min-h-14 items-center justify-center rounded-2xl border border-line bg-surface px-3 py-3 text-center text-sm font-medium text-heading peer-checked:border-accent peer-checked:bg-surface-2 peer-focus-visible:outline-2 peer-focus-visible:outline-accent">{option}</span>
            </label>)}
          </div>
          {draftConditionText && <p className="mt-2 break-words text-sm text-muted">The AI draft said: {draftConditionText}</p>}
        </fieldset>
      </div>
      <div><Label htmlFor="category" required>Category</Label><select id="category" required className={fieldClass} value={form.category} onChange={e => { setForm(current => ({ ...current, category: e.target.value, subcategory: '' })); setChecklistAdded(false); }}>
        <option value="" disabled>Choose a category</option>{alphabeticalOptions(DEAL_CATEGORIES).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>{selectedCategory?.hint && <p className="mt-2 text-sm text-muted">{selectedCategory.hint}</p>}</div>
      {Boolean(selectedCategory?.subcategories.length) && <div><Label htmlFor="subcategory" hint="optional">Subcategory</Label><select id="subcategory" className={fieldClass} value={form.subcategory} onChange={e => {
        const subcategory = e.target.value;
        setForm(current => { const result = categoryChecklist(current.category, subcategory, current.criteria); return { ...current, subcategory, criteria: result.criteria }; });
        setChecklistAdded(categoryChecklist(form.category, subcategory, form.criteria).added);
      }}><option value="">Choose a subcategory</option>{alphabeticalOptions(selectedCategory!.subcategories).map(sub => <option key={sub.id} value={sub.id}>{sub.label}</option>)}</select>
      {checklistAdded && <p role="status" className="mt-2 text-sm text-muted">Checklist added. You can edit it.</p>}</div>}
      <div><Label htmlFor="description" required>Description</Label><textarea id="description" required maxLength={1000} rows={3} className={`${fieldClass} py-3`} value={form.description} onChange={set('description')}/></div>
      </fieldset>
      <fieldset className="min-w-0 space-y-3 border-t border-line pt-5">
        <legend className="pr-2 text-base font-bold text-heading">What’s included</legend>
        <p className="text-sm leading-relaxed text-muted">Optional. List the accessories and parts the buyer should receive.</p>
        <TermsListEditor id="included-items" label="Item" value={form.includedItems} maxLength={1000} onChange={value => setForm(current => ({ ...current, includedItems: value }))}/>
      </fieldset>
      <fieldset className="min-w-0 space-y-4 border-t border-line pt-5">
        <legend className="pr-2 text-base font-bold text-heading">Buyer checks</legend>
        <p className="text-sm leading-relaxed text-muted">Optional. Add specific checks the buyer can support with a photo or short video.</p>
      <TermsListEditor id="criteria" label="Check" value={form.criteria} maxLength={1500} onChange={value => setForm(current => ({ ...current, criteria: value }))}/>
      </fieldset>
      </Card>

      <aside aria-label="Deal summary" className="min-w-0 space-y-3 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2">
        <Card className="min-w-0 space-y-4 p-5">
          <h2 className="text-base font-bold text-heading">Deal summary</h2>
          <div className="border-b border-line pb-4">
            <p className="break-words text-sm font-semibold text-heading">{form.item.trim() || 'Your item'}</p>
            <p className="mt-2 break-words text-3xl font-bold tabular-nums text-heading">{amountPreview}</p>
            <p className="mt-1 text-sm text-muted">USD · {simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'}</p>
          </div>
          <dl className="space-y-3 text-sm">
            {[
              ['Condition', form.condition.trim() || 'Not specified'],
              ['Category', categorySummary(form.category, form.subcategory)],
              ['Included items', String(includedCount)], ['Buyer checks', String(criteriaCount)],
              ['Seller ships within', `${time.shipByDays} days`],
              ['Buyer inspection', `${time.inspectionDays} days`],
              ['Evidence window', `${time.evidenceDays} days`],
            ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4"><dt className="text-muted">{label}</dt><dd className="min-w-0 max-w-[60%] break-words text-right font-semibold text-heading">{value}</dd></div>)}
          </dl>
          <details className="border-t border-line pt-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-heading">Fees & refunds</summary>
            <p className="pb-2 text-sm leading-relaxed text-muted">PayPal fees are shown after payment and are not returned on a refund. The fee is covered by the platform, so the buyer receives the full refund amount.</p>
          </details>
        </Card>
        <Notice>Demo payments only. No real money moves.</Notice>
      </aside>

      <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
        <Button type="submit" fullWidth disabled={busy}>{busy ? 'Creating…' : 'Create deal'}</Button>
        <p className="text-center text-sm leading-relaxed text-muted">Creates a draft to share with the buyer. Terms lock after both parties accept.</p>
        <ErrorNote error={error}/>
      </div>
    </form>
  );
}
