'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui';
import { callApi, ErrorNote } from './client';
import { TermsAssistant } from './TermsAssistant';
import { mergeCriteria, TERMS_TEMPLATES } from '../lib/termsTemplates';

import { descriptionForDraft } from '../lib/ai/termsFields';

const fieldClass = 'min-h-11 w-full rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted';
function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-xs font-medium text-muted">{children}{hint && <span className="ml-1 font-normal">({hint})</span>}</label>;
}

export function NewDealForm() {
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

  return (
    <form onSubmit={submit} className="min-w-0 space-y-4">
      <TermsAssistant appliedReceipt={receipt} onApply={({ draft, receipt: draftReceipt }) => {
        if (!receipt) setManualFields(form);
        setForm(current => ({ ...current, item: draft.item, condition: draft.condition,
          description: descriptionForDraft(draft), includedItems: draft.includedItems.join('\n'), criteria: draft.criteria.join('\n'), category: '' }));
        setReceipt(draftReceipt);
      }}/>
      {receipt && <div className="space-y-2"><p className="text-xs text-muted">AI draft applied. Check and edit every field before sharing.</p><Button type="button" variant="ghost" onClick={() => {
        if (manualFields) setForm(current => ({ ...manualFields, amount: current.amount }));
        setReceipt(null);
      }}>Continue with manual terms</Button><p className="text-xs text-muted">Restores your fields from before the draft; your entered price is kept.</p></div>}
      <div><Label htmlFor="item">Item</Label><input id="item" required maxLength={200} className={fieldClass} placeholder="Used phone, 128 GB" value={form.item} onChange={set('item')}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="amount">Price (USD)</Label><input id="amount" required inputMode="decimal" pattern="\d{1,6}(\.\d{1,2})?" className={fieldClass} placeholder="120.00" value={form.amount} onChange={set('amount')}/></div>
        <div><Label htmlFor="condition">Condition</Label><input id="condition" required maxLength={120} className={fieldClass} placeholder="Good" value={form.condition} onChange={set('condition')}/></div>
      </div>
      <div><Label htmlFor="included-items" hint="optional, one per line">Included items</Label><textarea id="included-items" maxLength={1000} rows={3} className={`${fieldClass} py-3`} placeholder={'Phone\nCharging cable\nOriginal box'} value={form.includedItems} onChange={set('includedItems')}/></div>
      <div><Label htmlFor="description">Description</Label><textarea id="description" required maxLength={1000} rows={3} className={`${fieldClass} py-3`} placeholder="What is included, known flaws" value={form.description} onChange={set('description')}/></div>
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
      <div><Label htmlFor="criteria" hint="optional, one per line">What the buyer can check</Label><textarea id="criteria" maxLength={1500} rows={3} className={`${fieldClass} py-3`} placeholder={'Battery health at least 85%\nScreen has no cracks'} value={form.criteria} onChange={set('criteria')}/></div>
      <Button type="submit" fullWidth disabled={busy}>{busy ? 'Creating…' : 'Create & share link'}</Button>
      <ErrorNote error={error}/>
    </form>
  );
}
