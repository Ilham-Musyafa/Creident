'use client';
// Interactive pieces. They only call the existing JSON API; all rules stay on the server.

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './ui';
import { TechnicalDetails } from './TechnicalDetails';
import { SegmentedControl } from './SegmentedControl';
import type { Role } from './view';
import { ConfirmSheet, type ConfirmDetails } from './ConfirmSheet';

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly debugId?: string) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  REVIEWER_CODE_REQUIRED: 'This demo needs the reviewer access code. Enter it in Settings.',
  SANDBOX_CONFIG_MISSING: 'Payments are not configured on this server. Ask the demo owner to check the setup, or explore the labelled demo deals.',
  ROLE_FORBIDDEN: 'This demo role cannot do that. Switch role in Settings.',
  EVIDENCE_CLOSED: 'The evidence window is closed.',
  ORDER_NOT_APPROVED: 'The payment has not been approved on PayPal yet.',
  ACTION_PENDING: 'A PayPal action for this deal is still pending. Try again later.',
  SPLIT_PENDING: 'A split decision is pending for this deal.',
  INVALID_STATE: 'This action is not possible in the current status. Refresh the page.',
  UNKNOWN_TRACKING: 'Use one of the demo tracking numbers.',
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
    <div role="alert" className="mt-3 rounded-[14px] border p-3 text-sm" style={{ background: 'var(--disputed-bg)', borderColor: 'var(--line)', color: 'var(--disputed-text)' }}>
      <p>{error instanceof ApiError && FRIENDLY[error.code] ? FRIENDLY[error.code] : error instanceof ApiError && /PAYPAL|ORDER|SANDBOX/.test(error.code) ? "PayPal couldn't complete this step. Try again later." : "This step couldn't be completed. Check the details and try again."}</p>
      <TechnicalDetails><p>{error.message}</p>{error instanceof ApiError && <p>Code: {error.code}</p>}{debugId && <p className="break-all font-mono">PayPal debug id: {debugId}</p>}</TechnicalDetails>
    </div>
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
export function ActionButton({ path, role, body = {}, label, busyLabel = 'Working…', variant = 'accent', fullWidth = false, redirectTo, confirm }: {
  path: string; role: Role; body?: unknown; label: string; busyLabel?: string; variant?: 'accent' | 'ghost' | 'strong'; fullWidth?: boolean; redirectTo?: string;
  /** Show a confirmation sheet first; used for actions that move money. */
  confirm?: ConfirmDetails;
}) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [asking, setAsking] = useState(false);
  // The sheet closes on confirm so a failure message below the button stays visible.
  const act = () => { setAsking(false); return run(async () => {
    await callApi(path, role, body);
    if (redirectTo) router.push(redirectTo); else router.refresh();
  }); };
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <Button variant={variant} fullWidth={fullWidth} disabled={busy} onClick={() => confirm ? setAsking(true) : act()}>{busy ? busyLabel : label}</Button>
      {confirm && <ConfirmSheet details={confirm} open={asking} busy={busy} onConfirm={act} onCancel={() => setAsking(false)}/>}
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

export function ReviewerCodeForm({ unlocked, id = 'reviewer-code' }: { unlocked: boolean; id?: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  return (
    <form className="space-y-2" onSubmit={(e) => {
      e.preventDefault();
      document.cookie = `hv-reviewer-code=${encodeURIComponent(code.trim())}; path=/; max-age=604800; samesite=strict`;
      setCode('');
      router.refresh();
    }}>
      <Label htmlFor={id}>Reviewer access code</Label>
      <input id={id} type="password" autoComplete="off" className={fieldClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder={unlocked ? 'Saved on this device' : 'Ask the demo owner'}/>
      <Button type="submit" variant="ghost" fullWidth disabled={!code.trim()}>Save code</Button>
      <p className="text-sm text-muted">{unlocked ? 'Reviewer actions are unlocked on this device.' : 'This demo needs a code before anyone can act as the reviewer.'}</p>
    </form>
  );
}

export function PayButton({ txId, simulated = false, amount, item }: { txId: string; simulated?: boolean; amount?: string; item?: string }) {
  const { busy, error, run } = useAction();
  const [asking, setAsking] = useState(false);
  const label = simulated ? 'Continue to demo PayPal' : 'Continue to PayPal (Sandbox)';
  const pay = () => { setAsking(false); return run(async () => {
    const data = await callApi<{ approvalUrl?: string }>(`/api/transactions/${txId}/pay`, 'buyer', {});
    if (data.approvalUrl) window.location.href = data.approvalUrl;
  }); };
  return (
    <div>
      <Button fullWidth disabled={busy} onClick={() => amount ? setAsking(true) : pay()}>{busy ? 'Opening PayPal…' : label}</Button>
      {amount && <ConfirmSheet open={asking} busy={busy} onConfirm={pay} onCancel={() => setAsking(false)} details={{
        title: 'Approve payment', amount, amountCaption: item,
        rows: [{ label: 'Charged now', value: 'Nothing yet' }, { label: 'Charged when', value: 'You confirm the item, or a problem is decided' }, { label: 'Payment method', value: simulated ? 'Demo PayPal' : 'PayPal Sandbox' }],
        note: 'If the seller does not ship in time, the payment is cancelled and nothing is charged.', confirmLabel: 'Continue to PayPal',
      }}/>}
      <ErrorNote error={error}/>
    </div>
  );
}

const fieldClass = 'min-h-11 w-full rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted';

function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-muted">{children}{hint && <span className="ml-1 font-normal">({hint})</span>}</label>;
}


export function ShipForm({ txId }: { txId: string }) {
  const { busy, error, run } = useAction();
  const router = useRouter();
  const [tracking, setTracking] = useState('DEMO-DELIVERED');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await callApi(`/api/transactions/${txId}/ship`, 'seller', { tracking }); router.refresh(); }); }}>
      <div>
        <Label htmlFor="tracking" hint="demo tracking">Tracking number</Label>
        <select id="tracking" className={fieldClass} value={tracking} onChange={(e) => setTracking(e.target.value)}>
          <option value="DEMO-DELIVERED">Delivered on time</option>
          <option value="DEMO-IN-TRANSIT">Still in transit</option>
          <option value="DEMO-WRONG-DESTINATION">Delivered to another address</option>
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
          <option value="photo">Photo description</option>
          <option value="chat">Chat excerpt</option>
          <option value="note">Note</option>
        </select>
        <p className="mt-1 text-sm text-muted">{kind === 'photo' ? 'Describe what the photo shows, including the one-time code.'
          : kind === 'chat' ? 'Paste the relevant messages from your chat with the other party.' : 'Anything else the reviewer should know.'}</p>
      </div>
      <div><Label htmlFor="content">Evidence</Label><textarea id="content" required maxLength={4000} rows={4} className={`${fieldClass} py-3`} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What does it show? Mention the one-time code if it is a photo."/></div>
      <Button type="submit" fullWidth disabled={busy || !content.trim()}>{busy ? 'Submitting…' : 'Submit evidence'}</Button>
      <ErrorNote error={error}/>
    </form>
  );
}

export function ReturnForm({ txId }: { txId: string }) {
  const { busy, error, run } = useAction();
  const router = useRouter();
  const [tracking, setTracking] = useState('DEMO-DELIVERED');
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await callApi(`/api/transactions/${txId}/return`, 'buyer', { tracking }); router.refresh(); }); }}>
      <p className="text-sm text-text">Ship the item back to the seller, then add the return tracking. The refund runs once it is delivered to the seller.</p>
      <div>
        <Label htmlFor="return-tracking" hint="demo tracking">Return tracking number</Label>
        <select id="return-tracking" className={fieldClass} value={tracking} onChange={(e) => setTracking(e.target.value)}>
          <option value="DEMO-DELIVERED">Returned to the seller</option>
          <option value="DEMO-IN-TRANSIT">Still in transit</option>
          <option value="DEMO-WRONG-DESTINATION">Delivered to another address</option>
        </select>
      </div>
      <Button type="submit" fullWidth disabled={busy}>{busy ? 'Saving…' : 'Add return tracking'}</Button>
      <ErrorNote error={error}/>
    </form>
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

/** Download through fetch so the API receives the current demo-role header. */
async function downloadAuditCsv(txId: string, role: Role) {
  const response = await fetch(`/api/audit/${txId}/export`, { headers: { 'x-demo-role': role } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    throw new ApiError(String(body.error ?? 'EXPORT_FAILED'), String(body.message ?? 'The record could not be downloaded. Please try again.'));
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-${txId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The "⋯" menu on a deal record: less-used actions kept out of the main list. */
export function RecordMenu({ txId, role }: { txId: string; role: Role }) {
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest('[data-record-menu]')) setOpen(false); };
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); };
  }, [open]);
  const item = 'flex min-h-11 w-full items-center rounded-[10px] px-3 text-left text-sm font-semibold text-heading hover:bg-surface-2';
  return <div data-record-menu className="relative">
    <button type="button" aria-label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
      className="hv-press grid size-11 place-items-center rounded-full border border-line bg-surface text-heading hover:bg-surface-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
    </button>
    {open && <div role="menu" className="hv-page absolute right-0 z-30 mt-2 w-56 rounded-[14px] border border-line bg-surface p-1 shadow-lg">
      <button role="menuitem" type="button" disabled={busy} className={item}
        onClick={() => run(async () => { await downloadAuditCsv(txId, role); setOpen(false); })}>{busy ? 'Downloading…' : 'Download as CSV'}</button>
      <a role="menuitem" href="/audit/how-it-works" className={item}>How verification works</a>
    </div>}
    {error && <div className="absolute right-0 mt-14 w-64"><ErrorNote error={error}/></div>}
  </div>;
}

export function PayPalDisputeActions({ txId, disputeId, role, actions }: { txId: string; disputeId: string; role: Role; actions: string[] }) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  async function act(action: 'evidence' | 'escalate') {
    setMessage('');
    await run(async () => {
      const result = await callApi<{ message: string }>(`/api/transactions/${txId}/paypal-dispute/${action}`, role, { disputeId, ...(action === 'escalate' ? { confirm: true } : {}) });
      setMessage(result.message); setConfirming(false);
    });
    router.refresh();
  }
  return <div className="space-y-3">
    {!actions.includes('provide_evidence') && actions.includes('send_message') && <p className="text-sm text-muted">Inquiry stage: this sends a short message. The evidence PDF needs the claim stage and PayPal must offer provide_evidence first.</p>}
    {(actions.includes('provide_evidence') || actions.includes('send_message')) && <Button variant="ghost" fullWidth disabled={busy} onClick={() => act('evidence')}>{busy ? 'Sending…' : 'Send Creident evidence to PayPal'}</Button>}
    {actions.includes('escalate') && (confirming ? <div className="space-y-3 rounded-[18px] border border-line bg-surface p-4">
      <p className="text-sm text-heading">Ask PayPal to step in? This turns the inquiry into a PayPal claim and cannot be undone.</p>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button><Button disabled={busy} onClick={() => act('escalate')}>{busy ? 'Escalating…' : 'Confirm escalation'}</Button></div>
    </div> : <Button variant="ghost" fullWidth disabled={busy} onClick={() => setConfirming(true)}>Ask PayPal to step in</Button>)}
    {message && <p role="status" className="text-sm text-heading">{message}</p>}
    <ErrorNote error={error}/>
  </div>;
}
