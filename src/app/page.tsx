export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">Sandbox prototype</p>
      <h1 className="text-4xl font-bold tracking-tight text-heading">HalcyVault</h1>
      <p className="max-w-xl text-lg leading-8 text-text">
        A dispute-mediation prototype for peer-to-peer sales. Rules decide; AI summarises
        evidence; actions are recorded for audit.
      </p>
      <p className="rounded-[18px] border p-4 text-sm" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-line)', color: 'var(--warning-text)' }}>
        This is a PayPal Sandbox demo. It is not a licensed escrow service and does not
        handle real money.
      </p>
    </main>
  );
}
