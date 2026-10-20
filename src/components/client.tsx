'use client';
// Interactive pieces. They only call the existing JSON API; all rules stay on the server.

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './ui';
import { SegmentedControl } from './SegmentedControl';
import type { Role } from './view';
import { mergeCriteria, TERMS_TEMPLATES } from '../lib/termsTemplates';
import { DISPUTE_TYPES } from '../lib/disputeTypes';

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly debugId?: string) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  SANDBOX_CONFIG_MISSING: 'PayPal Sandbox keys are not set on this server. Explore with the demo deals, add PP_ID and PP_SECRET to .env, or set PAYPAL_MODE=simulated for a labelled simulation.',
  ROLE_FORBIDDEN: 'This demo role cannot do that. Switch role in Menu.',
  EVIDENCE_CLOSED: 'The evidence window is closed.',
  ORDER_NOT_APPROVED: 'The payment has not been approved on PayPal yet.',
  ACTION_PENDING: 'A PayPal action for this deal is still pending. Try again later.',
  SPLIT_PENDING: 'A split decision is pending for this deal.',
  INVALID_STATE: 'This action is not possible in the current status. Refresh the page.',
  UNKNOWN_TRACKING: 'Use one of the simulated tracking numbers.',
};

export async function callApi<T = Record<string, unknown>>(path: string, role: Role, body?: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'x-demo-role': role, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    const code = String(data.error ?? `HTTP_${res.status}`);
    throw new ApiError(code, FRIENDLY[code] ?? String(data.message ?? 'Something went wrong. Please try again.'), data.debug_id ? String(data.debug_id) : undefined);
  }
  return data as T;
}

export function ErrorNote({ error }: { error: ApiError | Error | null }) {
  if (!error) return null;
  const debugId = error instanceof ApiError ? error.debugId : undefined;
  return (
    <p role="alert" className="mt-3 rounded-[14px] border p-3 text-sm" style={{ background: 'var(--disputed-bg)', borderColor: 'var(--line)', color: 'var(--disputed-text)' }}>
      {error.message}
      {debugId && <span className="mt-1 block font-mono text-xs">PayPal debug id: {debugId}</span>}
    </p>
  );
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
    setBusy(true); setError(null);
    try { return await work(); } catch (e) { setError(e as Error); return undefined; } finally { setBusy(false); }
  }
  return { busy, error, run };
}

/** A button that POSTs to the API, then refreshes the page or navigates. */
export function ActionButton({ path, role, body = {}, label, busyLabel = 'Working…', variant = 'accent', fullWidth = false, redirectTo }: {
  path: string; role: Role; body?: unknown; label: string; busyLabel?: string; variant?: 'accent' | 'ghost' | 'strong'; fullWidth?: boolean; redirectTo?: string;
}) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <Button variant={variant} fullWidth={fullWidth} disabled={busy} onClick={() => run(async () => {
        await callApi(path, role, body);
        if (redirectTo) router.push(redirectTo); else router.refresh();
      })}>{busy ? busyLabel : label}</Button>
      <ErrorNote error={error}/>
    </div>
  );
}

export function RoleSwitch({ current }: { current: Role }) {
  const router = useRouter();
  const labels = { Buyer: 'buyer', Seller: 'seller', Reviewer: 'reviewer' } as const;
  const options = ['Buyer', 'Seller', 'Reviewer'] as const;
  const value = options.find((o) => labels[o] === current) ?? 'Seller';
  return <SegmentedControl label="Act as (demo)" options={options} value={value} onChange={(next) => {
    document.cookie = `hv-role=${labels[next]}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }}/>;
}

export function PayButton({ txId, simulated = false }: { txId: string; simulated?: boolean }) {
  const { busy, error, run } = useAction();
  return (
    <div>
      <Button fullWidth disabled={busy} onClick={() => run(async () => {
        const data = await callApi<{ approvalUrl?: string }>(`/api/transactions/${txId}/pay`, 'buyer', {});
        if (data.approvalUrl) window.location.href = data.approvalUrl;
      })}>{busy ? 'Opening PayPal…' : simulated ? 'Continue to simulated PayPal' : 'Continue to PayPal (Sandbox)'}</Button>
      <ErrorNote error={error}/>
    </div>
  );
}

const fieldClass = 'min-h-11 w-full rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted';

function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-xs font-medium text-muted">{children}{hint && <span className="ml-1 font-normal">({hint})</span>}</label>;
}

export function NewDealForm() {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [form, setForm] = useState({ item: '', amount: '', condition: '', description: '', criteria: '', category: '' });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const criteria = form.criteria.split('\n').map((c) => c.trim()).filter(Boolean);
      const amount = Number(form.amount).toFixed(2);
      const created = await callApi<{ transaction: { id: string } }>('/api/transactions', 'seller', {
        item: form.item, amount,
        terms: { condition: form.condition, description: form.description, ...(form.category ? { category: form.category } : {}), ...(criteria.length ? { criteria } : {}) },
      });
      // The seller accepts their own terms right away; the buyer accepts on the checkout screen.
      await callApi(`/api/transactions/${created.transaction.id}/accept`, 'seller', {});
      router.push(`/deals/${created.transaction.id}?created=1`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><Label htmlFor="item">Item</Label><input id="item" required maxLength={200} className={fieldClass} placeholder="Used phone, 128 GB" value={form.item} onChange={set('item')}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="amount">Price (USD)</Label><input id="amount" required inputMode="decimal" pattern="\d{1,6}(\.\d{1,2})?" className={fieldClass} placeholder="120.00" value={form.amount} onChange={set('amount')}/></div>
        <div><Label htmlFor="condition">Condition</Label><input id="condition" required maxLength={120} className={fieldClass} placeholder="Good" value={form.condition} onChange={set('condition')}/></div>
      </div>
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

export function DisputeForm({ txId }: { txId: string }) {
  const { busy, error, run } = useAction();
  const router = useRouter();
  const [type, setType] = useState<string>('not_as_described');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await callApi(`/api/transactions/${txId}/dispute`, 'buyer', { type }); router.push(`/deals/${txId}/evidence`); }); }}>
      <div>
        <Label htmlFor="dispute-type">What went wrong?</Label>
        <select id="dispute-type" className={fieldClass} value={type} onChange={(e) => setType(e.target.value)}>
          {DISPUTE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <Button type="submit" variant="ghost" fullWidth disabled={busy}>{busy ? 'Opening…' : 'Open dispute'}</Button>
      <ErrorNote error={error}/>
    </form>
  );
}

export function ShipForm({ txId }: { txId: string }) {
  const { busy, error, run } = useAction();
  const router = useRouter();
  const [tracking, setTracking] = useState('DEMO-DELIVERED');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await callApi(`/api/transactions/${txId}/ship`, 'seller', { tracking }); router.refresh(); }); }}>
      <div>
        <Label htmlFor="tracking" hint="simulated courier">Tracking number</Label>
        <select id="tracking" className={fieldClass} value={tracking} onChange={(e) => setTracking(e.target.value)}>
          <option value="DEMO-DELIVERED">DEMO-DELIVERED · delivered to the agreed address</option>
          <option value="DEMO-IN-TRANSIT">DEMO-IN-TRANSIT · still in transit</option>
          <option value="DEMO-WRONG-DESTINATION">DEMO-WRONG-DESTINATION · delivered elsewhere</option>
        </select>
      </div>
      <Button type="submit" fullWidth disabled={busy}>{busy ? 'Saving…' : 'Add tracking'}</Button>
      <ErrorNote error={error}/>
    </form>
  );
}

export function EvidenceForm({ txId, role }: { txId: string; role: Role }) {
  const { busy, error, run } = useAction();
  const router = useRouter();
  const [kind, setKind] = useState<'photo' | 'chat' | 'note'>('photo');
  const [content, setContent] = useState('');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await callApi(`/api/transactions/${txId}/evidence`, role, { kind, content }); setContent(''); router.refresh(); }); }}>
      <div>
        <Label htmlFor="kind">Type</Label>
        <select id="kind" className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="photo">Photo (describe it: camera upload is simulated in this demo)</option>
          <option value="chat">Chat excerpt (in-platform messages only)</option>
          <option value="note">Note</option>
        </select>
      </div>
      <div><Label htmlFor="content">Evidence</Label><textarea id="content" required maxLength={4000} rows={4} className={`${fieldClass} py-3`} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What does it show? Mention the one-time code if it is a photo."/></div>
      <Button type="submit" fullWidth disabled={busy || !content.trim()}>{busy ? 'Submitting…' : 'Submit evidence'}</Button>
      <ErrorNote error={error}/>
    </form>
  );
}

export function ReviewForm({ txId, pendingSplit }: { txId: string; pendingSplit: boolean }) {
  const { busy, error, run } = useAction();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const decide = (outcome: 'RELEASE' | 'SPLIT' | 'REFUND') => run(async () => {
    await callApi(`/api/transactions/${txId}/review`, 'reviewer', { outcome, reason });
    router.refresh();
  });
  const disabled = busy || reason.trim().length < 2;
  return (
    <div className="space-y-3">
      <div><Label htmlFor="reason">Reviewer decision (reason required)</Label><textarea id="reason" rows={3} maxLength={2000} className={`${fieldClass} py-3`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write the reason for this decision…"/></div>
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

export function SeedButton({ role, label = 'Load demo deals' }: { role: Role; label?: string }) {
  return <ActionButton path="/api/demo/seed" role={role} label={label} busyLabel="Loading demo deals…" variant="ghost" fullWidth/>;
}

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return <Button variant="ghost" fullWidth onClick={async () => {
    try { await navigator.clipboard.writeText(new URL(path, window.location.origin).toString()); setCopied(true); } catch { setCopied(false); }
  }}>{copied ? 'Link copied' : 'Copy link for the buyer'}</Button>;
}

/** Landing page after PayPal: completes the authorization through the API, then shows the deal. */
export function PayPalReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<ApiError | Error | null>(null);
  const txId = params.get('txId') ?? '';
  useEffect(() => {
    const query = new URLSearchParams();
    for (const key of ['txId', 'token', 'cancel']) { const v = params.get(key); if (v) query.set(key, v); }
    callApi(`/api/paypal/return?${query.toString()}`, 'buyer', undefined, 'GET')
      .then(() => router.replace(`/deals/${txId}`))
      .catch((e: Error) => setError(e));
  }, [params, router, txId]);
  return (
    <div className="rounded-[22px] border border-line bg-surface p-5">
      {!error && <p className="text-sm text-muted" role="status">Confirming your PayPal approval…</p>}
      <ErrorNote error={error}/>
      {error && txId && <a className="mt-3 inline-block text-sm font-semibold text-heading underline" href={`/deals/${txId}`}>Back to the deal</a>}
    </div>
  );
}
