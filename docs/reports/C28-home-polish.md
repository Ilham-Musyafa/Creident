# C28 — Home polish

Baseline origin/main 4db39e3, after C27 PR #92. Branch ui/home-polish.
UI only: no src/lib, API, state-machine/rule, schema, stored data or dependencies
changed. HomeData is a view-component prop type, not a persisted data model.

## Changes and reasons

| Area/files | Change | Reason |
|---|---|---|
| app/page.tsx, HomeStatusRow, homeTypes | Replace approval total/count with four existing-filter counts | Avoid implying a wallet or held balance |
| DesktopHome | Seller + New deal filled button next to outlined View deals | Make seller creation easy; Buyer View deals and Reviewer Review queue stay primary |
| MobileHome | Short greeting/header, no money/eye toggle, status tiles, one urgent next step, existing Your deals | Make the next action clear without a balance-like hero |
| MobileDock, layout, globals | Seller-only centered raised plus; four tabs for other roles; safe-area content padding | Real /deals/new link, active state, >=56px target, no content overlap |
| Home components, Settings destinations, history rows/menu, Review desk link | Remove decorative right arrows/glyphs | Cleaner buttons/rows; back/accordion/dropdown chevrons retained |
| MobileHome icons | Plus for New deal; document/list icon for Browse | Avoid swap/transfer symbolism |
| client.tsx ShipForm/ReturnForm | Short plain option labels, exact original values | Full readable tracking scenarios on narrow screens |
| globals.css | Shared white on-accent text and action-blue #2563EB; darker hover #1D4ED8 | White on original Sapphire is only 3.68:1; action blue is 5.17:1, hover 6.70:1 |
| displayItemName + deal/checkout/review/evidence/receipt/PayPal/history headers/cards | Strip leading [Demo] for display only | Existing badges/notices mark demo data; add explicit marker where stripping a prefix otherwise removes it |

Brand tokens remain Navy #0B1F4B, Sapphire #3B82F6, Sky #93C5FD, Ice #DBEAFE.
Only filled action/selected navigation backgrounds use darker action blue. Disabled
controls retain normal disabled appearance (WCAG inactive-control exception).
No original logo image, stored title or API tracking value changed.

## Filter choices for owner review

No new filters or status predicates were added. Counts call the same existing
matchesTransactionFilter helper as Transactions. Tiles overlap where those filters
overlap; they are not mutually exclusive buckets.

| Tile | Existing query | Meaning |
|---|---|---|
| Waiting for you | filter=action | Role's needs-action rows |
| In progress | filter=active | Existing active rows, including active problems |
| Problem | filter=review | Under review only, not every disputed/frozen deal |
| Completed | filter=closed | All closed deals, including cancellations/refunds |

This is the smallest interpretation of the requested labels with unchanged filter
logic. Desktop descriptions and link titles explain scope; compact mobile labels
keep descriptions available to assistive technology. Owner may prefer “Under review”
and “Closed” labels later. “Deal history” stays the C27 label for the Records slot.
There is no invented “Lost in transit” value; only the existing three tracking
scenarios are relabelled. A translation-direction arrow is functional text, retained.

## Verification

Node 22.23.4: npm test **522 tests / 50 files pass**, npm run typecheck **pass**,
npm run build **pass**, git diff --check **pass**. Existing assertions did not
require string changes; no test logic was weakened or replaced.

Production browser walkthrough: **12 final Home views**, 3 roles × 390/1440 ×
light/dark, simulated PayPal and recorded AI answers, synthetic local database,
fixed clock 2026-10-30 13:00 UTC. Zero page/console errors/warnings or horizontal
overflow. All four tile links checked against actual selected Transactions filter
counts on every view. No approved-money summary or [Demo] title prefix remains.
Seller dock has five items and a >=56px center link; others have four. New-deal
active state checked. All Home link/button targets >=44px; content bottom clears
the raised dock. Safe-area formula is included; headless inset is zero.

Additional light/dark 390px check: Add tracking computed white on #2563EB, hover
#1D4ED8; all three labels readable, original DEMO-* values intact. Deal header
omits prefix while SQLite stored item still has it. No shipping call was sent.
Read-only checks use real seeded/walkthrough data, no invented counts/provider calls.

Screens: docs/ui/screens/home-polish/ — 12 before and 12 after, captured from
isolated baseline/final builds. after-checks.json, before-checks.json and
tracking-contrast.json record checks. No production API/domain source diff.

Implementation 10ec6d1 pushed to origin/ui/home-polish. GraphQL and REST PR
creation both returned Forbidden; no PR created by this agent. Manual compare:
https://github.com/Ilham-Musyafa/Creident/compare/main...ui/home-polish
English summary prepared at /tmp/c28-pr.md. No merge/deployment.
