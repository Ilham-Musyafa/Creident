'use client';
import { useState } from 'react';
import { Button, CodeBadge } from './ui';

export function EvidenceCode({ code }: { code: string }) {
  const [message, setMessage] = useState('');
  return <div className="mt-4 rounded-2xl border border-line bg-bg p-4">
    <p className="mb-2 text-sm font-semibold text-heading">Evidence code</p>
    <div className="flex flex-wrap items-center gap-3"><CodeBadge code={code}/><Button type="button" variant="ghost" aria-label="Copy evidence code" onClick={async () => {
      try { await navigator.clipboard.writeText(code); setMessage('Code copied'); }
      catch { setMessage('Select and copy the code above.'); }
    }}>Copy</Button></div>
    {message && <p role="status" className="mt-2 text-sm text-muted">{message}</p>}
  </div>;
}
