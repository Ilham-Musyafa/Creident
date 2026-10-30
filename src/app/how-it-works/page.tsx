import { InfoPageShell } from '../../components/InfoPageShell';
import { ButtonLink } from '../../components/ui';
import { RULE_COPY } from '../../components/ruleCopy';

const steps = [
  ['Agree on the terms', 'Both sides agree on the item, its condition, and what the buyer will check.', 'Buyer + Seller', 'M7 7h10v14H7z M10 3h8v14 M10 11h4m-4 4h4'],
  ['Approve the payment — not charged yet', 'The buyer approves the payment before the seller ships.', 'Buyer', 'M3 6h18v12H3z M3 10h18m-5 5h2'],
  ['Ship the item and add tracking', 'The seller sends the item and adds tracking so the buyer can follow it.', 'Seller', 'M3 6h11v11H3z M14 10h4l3 4v3h-7 M7 17v3m11-3v3'],
  ['Item arrives — buyer checks it', 'The payment is charged after confirmation or when the check window ends without a reported problem.', 'Buyer', 'M4 8l8-4 8 4v10l-8 4-8-4z M4 8l8 4 8-4m-8 4v10'],
  ['A person decides any problem', 'Both sides add proof; AI summarizes, then a Reviewer (a person who decides the problem) decides.', 'Reviewer', 'M4 4h16v12H9l-5 4z M8 8h8m-8 4h5'],
  ['Every step stays in the deal history', 'Creident saves each step so both sides can read what happened.', 'Creident', 'M6 3h12v18H6z M9 7h6m-6 5h6m-6 5h4'],
] as const;

export default async function HowItWorksPage() {
  return <InfoPageShell title="How it works" subtitle="From agreeing on an item to checking what happened.">
    <ol className="mx-auto max-w-5xl">{steps.map(([title, text, actor, path], i) => <li key={title} className="relative flex gap-4 pb-7 last:pb-0">
      {i < steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-5 top-10 w-px bg-line"/>}
      <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-strong text-base font-bold text-on-strong">{i + 1}</span>
      <div className="min-w-0 flex-1 rounded-[24px] border border-line bg-surface p-4">
        <svg aria-hidden="true" className="mb-3 size-6 text-heading" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>
        <h2 className="text-lg font-bold text-heading">{title}</h2><p className="mt-2 text-sm leading-relaxed">{text}</p>
        <span className="mt-3 inline-block rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold text-heading">Who acts: {actor}</span>
      </div>
    </li>)}</ol>
    <section className="mx-auto mt-8 max-w-5xl"><p className="text-sm font-semibold text-heading">Demo only: no real money</p>
      <div className="mt-4 flex flex-wrap gap-3"><ButtonLink href="/deals/new">Try a deal</ButtonLink><ButtonLink href="/audit" variant="ghost">See the deal history</ButtonLink></div>
      <details className="mt-6 rounded-[24px] border border-line bg-surface p-4"><summary className="flex min-h-11 cursor-pointer items-center text-base font-bold text-heading">All the rules</summary>
        <ul className="mt-3 space-y-4">{RULE_COPY.map(rule => <li key={rule.id}><h3 className="text-sm font-bold text-heading">{rule.title} <span className="ml-2 inline-block rounded-full bg-surface-2 px-2 py-1 text-xs">{rule.id}</span></h3><p className="mt-2 text-sm leading-relaxed">{rule.text}</p></li>)}</ul>
      </details>
    </section>
  </InfoPageShell>;
}
