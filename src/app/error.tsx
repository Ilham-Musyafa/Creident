'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-5 py-16 text-center">
      <h1 className="text-xl font-extrabold text-heading">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The page could not be loaded. Your data is unchanged.</p>
      <button type="button" onClick={reset} className="mt-6 min-h-[46px] rounded-full bg-accent px-5 text-sm font-bold text-on-accent">Try again</button>
    </main>
  );
}
