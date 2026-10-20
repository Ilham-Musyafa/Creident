export default function Loading() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 pt-6" role="status" aria-label="Loading">
      <div className="h-6 w-40 animate-pulse rounded-full bg-surface-2"/>
      <div className="mt-5 h-40 animate-pulse rounded-[26px] bg-surface-2"/>
      <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-[18px] bg-surface-2"/>)}</div>
    </div>
  );
}
