# C26 — Submission polish (30 October 2026)

Baseline: latest origin/main `5e597fc`, branch `chore/submission-polish`.
Feature freeze respected: no feature/page/refactor or runtime source change; no P0
bug found. No state-machine, dispute-rule, PayPal or secret changes. No NOTICE.

## Changes and reasons

| File | Change | Reason |
|---|---|---|
| package.json / package-lock.json root | license: MIT | Root metadata lacked license; LICENSE already correct |
| README | Live demo `<RENDER_URL>` / Demo video `<YOUTUBE_URL>` | Owner fills URLs after deployment |
| README | Short Production path / not built yet list | Distinguish integrated Sandbox bridge run, live-model evaluation, seller payouts and multi-level appeals from completed work |
| README FAQ | “payment goes to the seller” → “approved payment is charged; Seller payout is not part of this prototype” | Capture does not implement payout |
| README identity | Old Georgia/Sapphire Flow identity description → current approved raster Check-C guide | Reflect current UI, not old assets |
| README lead logo and screenshots | v3 raster wordmark; regenerated gallery links | Current artwork and current UI/results, not historical screenshots |
| README screen labels | Deals list / Audit detail → Transactions / Record detail | Match current visible names |
| README license | MIT plus exact copyright line | Consistent with unchanged LICENSE |

LICENSE remains byte-identical to origin/main: MIT License; Copyright (c) 2026
Ilham Musyafa. No license decision was changed. Third-party dependency/font licenses
remain separate from the application's MIT license.

## Claim scan

Case-insensitive text search across README, UI source strings, docs, and package
metadata for the AGENTS claim-rule terms and payment/payout wording. Reviewed
matches in context: software-license wording (“until licensed”), prohibitions,
negative limitations and historical handoff notes are not product claims and were
not erased. The misleading affirmative payment-to-seller FAQ wording was corrected
as listed above. No new affirmative forbidden claim found in current UI/package
metadata. Metrics remain explicitly synthetic replay/harness results, not a live
model or guaranteed outcomes. Policy source AGENTS.md was not rewritten.

## Screenshots and demo walk

`docs/ui/screens/submission-polish/`: all 15 README gallery captures regenerated,
390×844 mobile light, 1440×900 desktop dark, oversight both themes at both widths.
Phone checklist selected on new-deal screenshot. Seeded synthetic examples plus
local walkthrough deals; all values come from the running app. Fixed QA clock
2026-10-30 13:00 UTC. No real payment/provider requests.

Isolated fresh SQLite database, PAYPAL_MODE=simulated, AI_MODE=replay, empty provider
credentials and synthetic reviewer code. Existing Playwright/Chromium used; no new
package. Walked Seller acceptance, Buyer checkout/approval, Seller shipping, Buyer
problem/evidence, Seller evidence, Reviewer reason/confirmed capture, receipt and
Records. Verified DRAFT → TERMS_LOCKED → AWAITING_APPROVAL → AUTHORIZED →
IN_INSPECTION → DISPUTED → UNDER_REVIEW → COMPLETED and record step verification.
Creation endpoint checked, then separately submitted the actual New deal form and
verified 201 and the share card. Browser core flow: no console errors/warnings or
page exceptions. Evidence: walkthrough.json and create-ui.json in the screenshot
folder. No P0 bug found; no application bug fix made.

**Remaining limitation:** all four Reviewer Oversight screenshots emit the existing
AG Studio “License Key Not Found” evaluation console errors (14 messages per load).
Core judge flow has zero browser errors/warnings. The strict zero-console criterion
therefore does not hold for Oversight. This is not a P0 and was not hidden, disabled,
or refactored during feature freeze. Owner must resolve SDK licensing/evaluation
permission before using Oversight in the final demo. No license key requested,
printed or changed. Node's experimental SQLite notice is a runtime warning, not a
browser console error. Screenshots.json preserves actual browser findings.

## Secrets check (read-only)

- Scanned 1,800 historical blobs reachable through all fetched refs using
  `git rev-list --objects --all` + `git cat-file --batch`, not only the current diff.
- Scanned tracked and nonignored working files plus root ignored .env* files without
  printing values. Rules: provider/GitHub/AWS token signatures, PEM private-key
  markers, credential-bearing URLs and nonempty credential assignments. Reviewed
  .env.example assignments; no credential finding there after excluding empty
  assignments/comments. No local secret or provider token found by these checks.
- Four marker findings (three history blobs, one working file) are assertions of
  the PEM header string in checkpoint.test.ts. Keys are generated at test runtime
  with generateKeyPairSync, not committed PEM bodies. Classified false positives.
- `git check-ignore .env` confirms .env is ignored; `git ls-files` and history path
  checks show no tracked .env/.env.local/.env.production. .env.example is intentionally
  tracked. .gitignore contains .env and .env.* with the example exception.
- No values, credentials, .env changes or history rewrite were committed. Pattern
  scanning cannot prove the absence of every arbitrary opaque secret; it found no
  actual secret within the above scope. No secrets were needed for the demo.

## Gates

Node 22.23.4: npm test **522 passed / 50 files**, npm run typecheck **pass**,
npm run build **pass**, git diff --check **pass**. Existing tests unchanged.
Implementation d4a8e2b pushed to origin/chore/submission-polish. PR creation via
GraphQL and REST both returned Forbidden; no PR created. Manual link:
https://github.com/Ilham-Musyafa/Creident/compare/main...chore/submission-polish
No merge/deployment.
