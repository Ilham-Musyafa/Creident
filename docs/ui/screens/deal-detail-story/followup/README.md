# Deal detail follow-up — 2026-10-26

Continued ui/creident-mockup from `e478337`. This supersedes the original story
pass's decision wording, secondary share-card placement and effect-driven desktop
disclosure. No src/lib/API/payment/status/rule/deadline/audit changes or dependencies.

## Four fixes

1. DealDecisionSummary distinguishes a recorded choice from completed payment.
   Capture uses the existing `captured` success flag; full refund/cancellation
   uses REFUNDED/VOIDED (or the corresponding frozenFrom); partial success uses
   completed partial-refund metadata or PARTIALLY_REFUNDED/frozenFrom. An event's
   requested effect or a human choice alone cannot prove financial success.
   Actual amounts use money(value, tx.currency), with the deal currency also shown
   on the reviewer amount line. No per-deal fee data exists in these records, so
   the card's hard-coded fee assertion is removed. No seller payout statement.
2. Seller sharing is directly after #next-step in the main column, before Decision,
   Progress and Activity. It applies for `created=1` OR DRAFT, as requested. Before
   b5dc67a the condition was only created=1, so the DRAFT fallback is an intentional
   extension here. The new copy does not assume the Seller already accepted.
3. The detail page once again calls PayPalDisputePanel unconditionally. Source
   comparison with b5dc67a's parent confirms that the panel itself already returned
   null for !captured && no cases. That pre-existing rule and every demo marker
   remain unchanged. Captured/no-case and existing-case views still render. The
   removed outer guard was redundant; no empty panel is fabricated for DRAFT.
4. DealDisclosure is server-rendered: a normal read-only desktop section and native
   mobile details, selected by CSS at 1024px. No effect/matchMedia state, no desktop
   closed-to-open jump, even without JavaScript. Only one variant is visible or
   in the accessibility tree at each width. These two read-only DOM variants have
   no duplicated IDs or interactive children; keep this component for terms/fees,
   not forms. Mobile starts closed and works with native keyboard input.

The 24px radius / 16px inset scale remains intact.

## Exact Decision heading text

Conditions below are evaluated within the recorded decision outcome. Full-refund
success and cancellation take priority over an awaiting-return/expired fallback.
`returned` means a stored RETURN_DELIVERED event; `returnExpired` means a stored
RETURN_DEADLINE_PASSED event. No new event types or verification logic.

| Decision / recorded state | Exact label |
| --- | --- |
| RELEASE, captured=true | Payment charged |
| RELEASE, captured=false (including failed/pending capture) | Decision recorded · payment step pending |
| REFUND, REFUNDED or frozenFrom REFUNDED, no return event | Refund issued to the buyer |
| Same, with return event | Refund issued to the buyer after the return |
| REFUND, VOIDED or frozenFrom VOIDED, no return event | Payment cancelled |
| Same, with return event | Payment cancelled after return |
| REFUND, RETURN_REQUESTED without a completed effect | Refund decision recorded · awaiting return |
| REFUND, captured=true + returnExpired, without completed refund/cancellation | Payment charged · return deadline passed |
| Other REFUND without completed effect | Decision recorded · payment step pending |
| PARTIAL_REFUND, completed metadata or PARTIALLY_REFUNDED/frozenFrom | Partial refund issued: {formatted recorded amount}; omit colon/amount if none is stored |
| PARTIAL_REFUND, cancelled | Partial refund not executed |
| PARTIAL_REFUND, RETURN_REQUESTED without success/cancellation | Partial refund decision recorded · awaiting return |
| Other PARTIAL_REFUND without success/cancellation | Partial refund decision recorded · payment step pending |
| SPLIT | Split decision recorded · payment step pending |

The separate partial amount line reads `Reviewer refund amount: {formatted amount}
{deal currency}` only when an amount exists, including the existing stored partial
amount fallback. It describes the reviewer's amount, not proof that it was issued.
Recommendation agreement/reason/receipt-link behavior remains unchanged.

## Screenshots and verification

Names: `{new-seller,release-buyer,refund-buyer,paypal-seller}-{light,dark}-{390,1440}.png`.
Viewport height 844px. PayPal shots scroll to the actual case panel, retaining its
Demo PayPal case notice. Other shots start at the top. Release is a real successful
simulated capture; REFUND is an actual required-return decision ending VOIDED, so
its card correctly says Payment cancelled after return, not Refund issued.

Fixtures were created through normal simulated create/accept/payment/shipping/
dispute/evidence/review APIs, or reuse actual decisions/cases from the earlier
browser walks. No payment-state edits were used to make these screenshots.
The QA database is /tmp/creident-story-followup.sqlite, a copy; original fixtures
and seed files unchanged. Disposable reviewer code only, no real PayPal/provider
calls or owner credentials. Production Node 22.23.4 app on local port 3231.

- npm test: 517 passed / 49 files. Eleven added cases cover successful/failed/pending
  RELEASE, successful/pending REFUND, frozen terminal states, requested-effect-only
  non-proof, partial metadata fallbacks, currency and pending split wording.
- EUR is a presentation-unit-test case only: create API/SQLite remain USD-only.
  No currency support or payment conversion has been added.
- npm run typecheck, npm run build and git diff --check passed.
- browser-checks.json: 60 views: 48 with JS (four deal states, three roles, two
  widths/themes) plus 12 without JS (new deal, all roles/widths/themes).
  The no-JS checks isolate actual server-rendered deal markup with application
  stylesheets: desktop terms/fees content is expanded immediately; mobile starts
  closed and native keyboard expansion works. No overflow/runtime errors.
  Seller share card is adjacent to next-step at both widths; mobile copy button
  fits above the dock. Copy writes the actual checkout URL; DRAFT sharing also
  works without created=1. Buyer/Reviewer do not receive the Seller share card.
  Uncaptured/no-case panel stays hidden, captured/no-case and real demo cases render.
- Full-app no-JS limitation observed: React streaming places the page under a
  hidden S:0 envelope until its bootstrap script reveals it. AppShell/streaming
  was not changed in this scoped fix. Therefore the 12 no-JS checks explicitly
  test isolated server markup, not a claim that the complete app works without JS.
  The 48 normal application views are tested with JS enabled. DealDisclosure
  itself has no client component, effects, matchMedia or hydration state.
- Scripts: /tmp/creident-followup-fixtures.py and creident-followup-browser.mjs.

No merge or deployment. Earlier screenshots/evidence in the parent directory are
historical captures of the b5dc67a implementation, not the final wording contract.
