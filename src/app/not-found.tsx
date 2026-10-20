import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-16 text-center">
      <h1 className="text-xl font-extrabold text-heading">Not found</h1>
      <p className="mt-2 text-sm text-muted">This deal or page does not exist.</p>
      <Link href="/" className="mt-6 inline-flex min-h-[46px] items-center rounded-full bg-accent px-5 text-sm font-bold text-on-accent">Go home</Link>
    </main>
  );
}
