'use client';
// Saves the current page as a PDF through the browser's print dialog (print styles hide navigation).
export function PrintButton({ label = 'Save as PDF' }: { label?: string }) {
  return <button type="button" onClick={() => window.print()}
    className="hv-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold text-heading hover:bg-surface-2 print:hidden">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>{label}
  </button>;
}
