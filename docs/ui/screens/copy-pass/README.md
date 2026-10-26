# Copy pass — 26 October 2026

Baseline: `527d3e7`, on the still-unmerged `ui/creident-mockup` branch.
Scope: user-facing copy and disclosure presentation only, both themes and widths.

## Review the changes

[Full before/after table](copy-changes.md): 114 changed source-copy groups, with
before/after file lines. It includes moved shared strings, not only replacements.
Internal enums, stored evidence/reasons and financial action payloads are unchanged.

| Before | After / presentation |
|---|---|
| Pay the seller; Release the payment to the seller | Charge the buyer (capture); no seller payout is claimed |
| Receipt RELEASE/REFUND choice treated as a completed effect | Shared stored-success-state formatter used by receipt and deal summary |
| Payment: Completed via PayPal | Charged via PayPal only when captured; otherwise Approved via PayPal · not charged yet |
| USD · fee borne by Platform on receipt | Deal currency; no unsupported fee receipt assertion |
| Audit / Deal records area title | Records |
| Create a deal / + New deal / Create deal link | New deal for entry actions; Create deal for form submission |
| Hello, Demo Buyer / Hi, demo buyer | Hi, Demo Buyer (same name casing for all three roles) |
| Fee borne by Platform | fee covered by the platform |
| Deal #UUID subtitle | Created [stored date] · Deal ID in technical details |
| Hashes, receipt/deal/evidence/case IDs, raw event names/codes in normal copy or tooltips | Original values available in initially closed Technical details |
| B1/S1 on review, E1 on receipt | Buyer evidence 1 / Seller evidence 1 (separate numbering per side) |
| Rule: R4 | Evidence clearly supports one side, then a secondary R4 chip |
| Repeated RuleNotice AI caveat | One shared AI-only-summarises / human-decides note per screen |
| USD · Sandbox demo regardless of mode | USD · Simulated payments or USD · PayPal Sandbox from the existing flag |
| Technical integration/evaluation prose as the main explanation | Plain explanation first, full diagnostic terms retained in Technical details |

Technical values moved without changing their calculation: deal UUID/terms hash,
checkout terms hash, evidence SHA-256/IDs/code, translation hashes, receipt reference
and recorded fingerprints/effect, record event/previous/current hashes, PayPal case
codes/IDs and original error/debug/request IDs. Original finding references remain
available in review technical details. Plain verification failures/mismatches stay
visible. Functional demo tracking selections and user-authored evidence stay intact.

The shared rule presentation source is `src/components/ruleCopy.ts`; it does not
replace or change the domain rules. See [UI glossary](../../../UI.md#shared-glossary-and-truthful-copy-2026-10-26).

## Payment result display

| Stored state | Result label |
|---|---|
| RELEASE, captured | Payment charged |
| RELEASE, capture failed/pending | Decision recorded · payment step pending |
| REFUND, REFUNDED (also frozenFrom) | Refund issued to the buyer; after the return when recorded |
| REFUND, VOIDED (also frozenFrom) | Payment cancelled; after return when recorded |
| Refund awaiting return | Refund decision recorded · awaiting return |
| Captured after missed return deadline | Payment charged · return deadline passed |
| Other unsuccessful/unconfirmed refund | Decision recorded · payment step pending |
| Successful partial refund | Partial refund issued, recorded amount in deal currency when available |
| Partial refund not executed/pending/awaiting return | Explicit not executed, payment step pending or awaiting return label |
| SPLIT | Split decision recorded · payment step pending |

These labels use the existing formatter extracted from DealDecisionSummary. A
requested payment effect is diagnostic data, not proof of successful execution.
The create API remains USD-only; EUR rendering coverage is compatibility, not new
currency support.

## Verification

- Node 22.23.4: `npm test` **522 tests / 50 files pass**; `npm run typecheck`
  **pass**; `npm run build` **pass**; `git diff --check` **pass**.
- [Browser matrix](browser-checks.json): **180 views**, 15 routes × Buyer/Seller/
  Reviewer × light/dark × 390/1440px. No page errors, horizontal overflow, default
  exposed raw hashes/UUIDs/event names or seller-payment claims. Greetings, mode,
  evidence aliases and one shared review disclaimer checked. Native record/deal
  disclosures work with keyboard and visible focus, including nested step details.
- [Interaction checks](interaction-checks.json): Buyer opens and cancels receipt
  confirmation; approval wording is accurate. Evidence original SHA-256 is still
  available by keyboard in its closed disclosure (>=44px target, >=14px body).
  Reviewer confirms Charge the buyer (capture), posts the unchanged RELEASE enum,
  and the receipt shows Payment charged only after actual successful simulation.
- Local production server, isolated disposable SQLite copy of 13 seeded deals,
  fixed clock 2026-10-26 13:00 UTC; simulated PayPal, AI replay, synthetic reviewer
  code. No real provider calls. Read-only screenshots/matrix precede the one
  simulated review mutation. Real PayPal pending/error UI is covered by existing
  state tests and error/disclosure rendering tests, not a live Sandbox run.
- Existing finance-state tests remain intact (capture success/failure/pending,
  refund success/pending, non-USD partial refund rendering). Added glossary,
  rule-title ordering, mode and closed-error-data tests. PayPal raw-code tests
  now verify closed placement, preserved values and escaping instead of a tooltip.

### Screenshots (390px, light)

- [Review, Reviewer](review-light-390.png)
- [Decision receipt, Buyer](receipt-light-390.png)
- [Decided deal, Buyer](deal-light-390.png)
- [Evidence, Buyer](evidence-light-390.png)
- [Record, Buyer](record-light-390.png)

Full-page screenshots show the complete copy, with the existing fixed bottom nav.
No page hierarchy/navigation was redesigned. No src/lib, API, schema, evaluation
fixture, payment, rule, deadline or audit-hashing change; no dependency added.

## Publication

Implementation `6ca3dfd` was pushed to `origin/ui/creident-mockup`. PR creation
returned GitHub GraphQL Forbidden; no PR was created by this agent.
[Create the PR manually](https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup).
Publication notes also appear in docs/HANDOFF.md. No merge or deployment.
