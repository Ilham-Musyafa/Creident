export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Sandbox prototype</p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">HalcyVault</h1>
      <p className="max-w-xl text-lg leading-8 text-slate-700">
        A dispute-mediation prototype for peer-to-peer sales. Rules decide; AI summarises
        evidence; actions are recorded for audit.
      </p>
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        This is a PayPal Sandbox demo. It is not a licensed escrow service and does not
        handle real money.
      </p>
    </main>
  );
}
