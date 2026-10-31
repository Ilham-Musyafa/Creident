'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { parseDealRef } from '../lib/parseDealRef';
import { Button } from './ui';

export function JoinDeal({ className = '' }: { className?: string }) {
  const router = useRouter();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const dealId = parseDealRef(value);
    if (!dealId) { setError(true); input.current?.focus(); return; }
    dialog.current?.close();
    router.push(`/deals/${dealId}/checkout`);
  }

  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-controls={id} className={className}
      onClick={() => { setValue(''); setError(false); dialog.current?.showModal(); input.current?.focus(); }}>Join a deal</button>
    <dialog ref={dialog} id={id} aria-labelledby={`${id}-title`} onClose={() => trigger.current?.focus()}
      className="fixed m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-[24px] border border-line bg-surface p-5 text-text shadow-xl backdrop:bg-black/45">
      <h2 id={`${id}-title`} className="text-xl font-bold text-heading">Join a deal</h2>
      <form onSubmit={submit} noValidate className="mt-5">
        <label htmlFor={`${id}-input`} className="mb-2 block text-sm font-medium text-heading">Paste the link your seller shared</label>
        <input ref={input} id={`${id}-input`} type="text" value={value} onChange={event => { setValue(event.target.value); setError(false); }}
          autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={2048} aria-invalid={error} aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-11 w-full rounded-[14px] border border-line bg-surface px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-accent"/>
        {error && <p id={`${id}-error`} role="alert" className="mt-3 text-sm text-[var(--warning-text)]">We couldn't find that deal. Check the link and try again.</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </dialog>
  </>;
}
