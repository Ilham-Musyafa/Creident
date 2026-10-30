# C27 — Plain language and How it works

Baseline: origin/main ac48912, which merges C26 in PR #91. Branch ui/plain-language.
Scope: presentation strings, one info page, its existing navigation links, and text
assertions only. No dependency, domain/rule order/state/API/data change.

## Display vocabulary

| Old term | New display wording / reason |
|---|---|
| dispute-mediation prototype | A demo that helps settle problems between a buyer and a seller |
| approved · not charged / authorized, not yet charged | Payment approved — not charged yet |
| capture (review action) | Charge the approved payment (an action, not a success claim) |
| charged via PayPal | Payment charged |
| voided / cancelled · not charged | Payment cancelled — no money moved (status label) |
| partial refund | Part of the money back (action), Part of the money returned (completed status) |
| partial refund pending | Money return agreed — payment step pending / waiting for the item |
| partial refund not executed | No money returned |
| reviewer | Reviewer (a person who decides the problem), explained in role chooser, problem review header and How it works |
| oversight | Review desk |
| simulated payments / simulated courier | Demo mode (no real money) / demo tracking |
| replay draft / recorded test run | Recorded AI answer |
| Records / audit log / audit chain / hash chain | Deal history in normal display copy |
| sealed copy / checkpoint | saved copy |
| Audit chain health / Record integrity | History check |
| Waiting for agreement / Agreed · ready to pay | Order placed |
| Delivered · checking | Delivered |
| B/S evidence display labels | Buyer proof N / Seller proof N (original aliases and IDs unchanged) |
| Refund | Refund (unchanged) |

Display updates cover shared status/event/activity labels, Home, navigation,
Transactions-adjacent shared rows, deal/receipt/review, PayPal confirmation text,
Settings, About, history area and Review desk. Technical values and identifiers
remain unchanged. Original evidence/reasons/AI output are not rewritten.

## Owner review choices

- “Order placed” labels DRAFT/TERMS_LOCKED only; it does not mean payment or acceptance
  happened. Domain states remain the same. Owner may prefer “Agree on the order”.
- A review button says “Charge the approved payment”, not “Payment charged”: before
  clicking, success is unknown. Pending/failed result labels remain truthful.
- Completed part-return status says “Part of the money returned”; the action says
  “Part of the money back”. No amount or payment-success logic changed.
- The Reviewer definition appears in the role chooser, problem-review header and
  the new explanation. Compact role triggers stay short to fit phone headers.
- Step four mentions the check-window outcome in its sentence. It does not promise
  an immediate charge merely because the parcel arrived.
- Saved technical explanations in Technical details are retained. The dedicated
  /audit/how-it-works source is deliberately unchanged, as explicitly requested;
  it keeps the detailed history-check vocabulary and its route.

## One new info page

/how-it-works uses InfoPageShell, MobileBrandHeader and existing theme/card tokens.
Six numbered circles and connector lines, inline icons, short explanations and
Who acts chips. Demo note, Try a deal and See the deal history link to real routes.
All the rules is native details, >=44px keyboard summary, reusing RULE_COPY.
R1–R7 titles/descriptions are presentation only; IDs and rule behavior unchanged.

Desktop Learn and mobile/desktop Settings explanation links now use /how-it-works.
Record-verification links still use /audit/how-it-works. /about#decisions still
exists and was browser-checked; its shared rule copy reflects the new wording.

## Verification

Node 22.23.4: npm test 522/50 files pass; typecheck/build/diff check pass.
Existing assertions changed only for new literal copy: presentationCopy,
DealDecisionSummary, and partialRefund receipt API test. Assertions for outcome,
amount, provenance, hashes, idempotency and status remain intact. Postman assertions
check API fields/enums, not these presentation strings, so no changes were needed.
No production API source or src/lib change.

Production browser QA: 28 views = Home, Transactions, inspection deal, Deal history,
Settings, About, How it works ×390/1440 ×light/dark. Simulated payments, replay AI,
local synthetic data, no provider credentials/calls. No browser console warnings,
errors, page exceptions or horizontal overflow. Native rules accordion, action
routes, menu targets and /about#decisions checked. Existing Review desk licensing
messages from C26 are not claimed fixed; that sponsor page is outside the requested
seven-page browser matrix.

Screenshots: docs/ui/screens/plain-language/. Before = /how-it-works returned 404
on isolated origin/main build, because this route is new; after = new six-step page.
Only this route was photographed, both themes and widths. checks.json records QA.

Owner decision 2026-10-30: license stays MIT; UI language stays English for the hackathon, Indonesian later.

Implementation 0ebc257 pushed to origin/ui/plain-language. GraphQL and REST PR
creation both returned Forbidden; no PR created by this agent. Manual compare:
https://github.com/Ilham-Musyafa/Creident/compare/main...ui/plain-language
English summary/term list above can be used in the PR. No merge or deployment.
