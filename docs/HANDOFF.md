# HANDOFF.md

Shared notes so any agent (Claude, Codex, others) can continue the work.
Update this file at the end of every session and before usage limits run out.
Keep it short and current. Newest entry first in the log.

## How to resume

1. Read `AGENTS.md`, `docs/DESIGN.md`, `docs/UI.md`, `docs/SANDBOX-NOTES.md`, then this file.
2. `git fetch origin`, check `git status` and the open pull requests.
3. Pick the first item under "Next steps" unless the owner says otherwise.
4. Create a new branch **from the latest `origin/main`**, and only after the previous PR is
   merged. Do not stack a new task on an unmerged branch. Do not push to `main`.

## Current status (2026-10-21)

Project locked on 2026-10-20: dispute-mediation prototype for the PayPal AI Hackathon,
working name HalcyVault, narrow scope (`docs/DESIGN.md`). Repo `Ilham-Musyafa/HalcyVault`
is private during development; it must be made public before submission and stay public
until 15 Dec 2026.

Built on `main` (including R5 dispute-type handling and PayPal dispute bridge PR #31):
- Core domain (`src/lib/domain`, `audit`, `rules`, `paypal`): state machine, hash-chained
  audit log, rules R1-R7, fetch-based PayPal client incl. webhook signature verification.
- Persistence and orchestrator (`src/lib/db.ts`, `repository.ts`, `orchestrator.ts`):
  SQLite via `node:sqlite`, per-transaction audit `seq`, append-only events, request ids
  claimed before PayPal calls; interrupted calls stay pending for reconciliation instead
  of being sent twice.
- JSON API (`src/app/api/**`): create, accept terms, pay, PayPal return, ship (mock
  courier), confirm, dispute, evidence, review (reason required), audit and verify,
  deadline tick, PayPal webhook. Demo roles via `x-demo-role`; no real authentication.
- AI evidence summary (`src/lib/ai/evidence.ts`): OpenAI-compatible adapter (env
  `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`), strict schema, one retry, name masking,
  seeded order, injection flag, replay mode by default without a key. It is wired
  into review preparation at all three paths to
  `UNDER_REVIEW`: evidence complete, evidence deadline, and tracking mismatch. The
  stored recommendation includes the AI summary or null, rule, action, reasons, and
  human-review requirement, plus an audit event. GET `/api/transactions/:id/review`
  reads it. AI failure becomes an R5 human escalation. `SPLIT` with a human reason is
  recorded as pending without moving funds.
- Evaluation (`eval/`, `npm run eval`): 40 synthetic dispute cases + 10 injection cases,
  six counterfactual variants each, report in `eval/report.md`. The owner reviewed
  10 labels individually and accepted 40 drafts without individual review. The R5
  follow-up (`eval/owner-label-review-2026-10-21-r5.json`) resolved the five flagged
  conflicts. Replay: 23/50 escalations, no base result differs from its label.
  These results check the harness/rules, not a live model.
- Sandbox smoke script (`npm run smoke`) for the owner's PC.
- UI (merged PR #7): eight main screens plus Deals list, About, PayPal return, two-column
  desktop home, light/dark/system theme, demo seed (`[Demo]` deals, `DEMO-*` ids).
- Simulated PayPal mode (`PAYPAL_MODE=simulated`, branch `feat/demo-paypal-mode`): money
  steps use `src/lib/paypal/simulated.ts` (no network, `SIM-*` ids); the buyer approves on
  the labelled page `/paypal/simulated`; every money event carries `simulated: true` and
  `paypalMode: "simulated"`; deal pages show a "Simulated payment" notice for `SIM-`/`DEMO-`
  deals. Default stays the real Sandbox. Webhooks always use the real Sandbox client.

- PayPal tracking after capture (`src/lib/paypalTracking.ts`, branch `feat/paypal-tracking`):
  confirm, reviewer RELEASE and the inspection deadline call Orders v2 `/track` with the
  stored tracking number; idempotent per attempt, failures retried by `/api/jobs/tick`
  (max 3). `npm run smoke` path b now also tests it against the real Sandbox.

Checks on 2026-10-21: `npm test` 195 passed (26 files), typecheck and build passed.
Simulated core and dispute-bridge flows were checked in Chromium (see dated logs).
The owner ran both Sandbox smoke paths and the separate Disputes API probe.

Not verified yet: integrated real Sandbox UI/JSON routes and dispute bridge, real
webhook delivery (needs a public HTTPS URL), and any live AI provider call.

## Active agents (2026-10-22 01:50 WIB)

Owner approved the AI assist features (DESIGN 6.1) and asked for two agents in parallel,
one task at a time each. Keep to your own files; put new UI in new component files rather
than growing `src/components/client.tsx`; shared helper `src/lib/ai/assist.ts` changes
only with a note here.
- **Codex:** C16 merged in PR #42; C17 evidence completeness implemented on
  `feat/c17-evidence-check`, awaiting Claude review. C18 reviewer copilot is next,
  not started.
  Files: `src/lib/ai/terms*`, `src/lib/ai/evidenceCheck*`, `src/lib/ai/copilot*`, the
  new-deal flow, evidence forms, review page.
- **Claude:** #4 outbound drafts (`src/lib/ai/drafts*`, PayPal dispute panel, courier claim
  pack), then #5 translation (`src/lib/ai/translate*`) after C18 is merged, because both
  touch the review page.

## How to run

```
npm ci
npm test
npm run typecheck
npm run build
npm run dev        # http://localhost:3000
# PAYPAL_MODE=simulated npm run dev   # whole flow without Sandbox keys (labelled simulation)
npm run eval       # writes eval/report.md (replay mode without an AI key)
npm run smoke      # owner's PC only: real PayPal Sandbox, reads .env
```

## Next steps

1. Done 2026-10-21: owner ran `npm run smoke`, both paths pass (see docs/SANDBOX-NOTES.md).
2. Done: AI evidence summary wired into review preparation (PR #5). Only the human review
   POST records RELEASE or REFUND decisions for disputed transactions; a required return
   defers the money call. SPLIT remains recorded-only by owner decision (2026-10-21);
   partial execution is deferred.
3. Done: the eight UI screens (PR "UI screens"), plus Deals list, About, PayPal return
   page, loading/error/not-found states. Pages read through `src/app/_server.ts`; every
   change goes through the JSON API. Demo deals: Menu > "Load demo deals"
   (`POST /api/demo/seed`, labelled `[Demo]`, simulated PayPal stub, real audit chains).
   In Sandbox mode without keys, money-moving actions (pay, confirm, decisions) show a clear
   "keys not set" message; non-money steps (ship, dispute, evidence, split) work.
   Done: labelled simulated PayPal mode (`PAYPAL_MODE=simulated`) so judges can click the
   whole flow without keys.
4. Owner: optionally review the remaining 40 accepted drafts individually, expand
   the set toward DESIGN section 10, and run with the chosen live provider. Current
   labels are 10 individually reviewed / 40 accepted drafts; R3/R5 conflicts are resolved.
5. Owner: public HTTPS URL + `PP_WEBHOOK_ID`, then test real webhook delivery.
6. README records the owner's successful smoke/probe runs and current replay results.
   Update it after integrated Sandbox checks and live-model evaluation.

## Decisions

Decided: stack Next.js + TypeScript + SQLite + Tailwind; fund model A (authorize then
capture); license MIT; visual direction Midnight Ink + Mint with light/dark/system
(`docs/UI.md`); coding tools Claude Code and Codex (handoff through this file).

Tentative: AI provider DeepSeek V4.1 Flash via the owner's Hive API key (verify model name,
API terms, strict-JSON reliability, image support).

Decided 2026-10-21: business model is a 1.5% service fee paid by the seller (documented only,
not charged in the prototype); split stays recorded-only; the platform bears the PayPal fee on a refund (buyer refunded in full);
deadlines ship-by 3, inspection 2, evidence 2 days (env-configurable).

Still open:
- Final public name (the word "Vault" suggests custody; temporary, owner will rename later).
  Shortlist (2026-10-21, owner re-checks before the video; English names only):
  Pactrail (Claude's first pick: pact + audit trail, no product found), Evenhand,
  Clarus (clear meaning, but widely used), Vectrust, Solventy, Vectro, Middlemark,
  Settlewise. Avoid Vectra (Vectra AI), Dealtrail (close to Dealertrack) and words like
  escrow/safe/guard/secure (claim rules). Rename README, UI and video script in one PR.
- Hosting / public demo link: owner chose "decide later" (after smoke test and video).
- License: MIT for now. Owner plans to switch to Apache-2.0 (LICENSE + NOTICE + README)
  while the repo is still private, i.e. before it goes public around 10 Nov; switching after
  it is public would leave the published versions under MIT.

## Do not forget

- Deadline: 13 Nov 2026, 03:00 WIB (12 Nov, 12:00 PM PT). Internal target: 11 Nov night.
- Everything for judges must be in English. Demo video under 3 minutes on YouTube.
- Never commit secrets. Sandbox only.
- Avoid forbidden claims listed in `AGENTS.md`.
- Make the repo public before submitting.

## Log

- 2026-10-22 07:15 WIB (Claude, before a usage reset): merged C17 evidence completeness
  (#45; 337 tests, build, browser check). Added docs/PROPOSAL-PARTIAL-REFUND.md (partial
  refund by reviewer + PayPal accept-claim/make-offer), waiting for owner approval.
  State now: AI assists 1, 2, 4 merged; next Codex C18 reviewer copilot (prompt to be
  written by Claude from DESIGN 6.1 row 3), then Claude #5 translation. Codex branch
  fix/terms-validator-units was not started. Other open items for the owner: 12 draft
  shipping labels (2 disagreements), fee minimum/cap idea ($0.50 / $15, docs only),
  "international examples" paragraph for README Problem section, license switch to
  Apache-2.0 before going public, name choice, live-model eval key, real Sandbox run of the
  bridge, AG Grid sponsor decision.
- 2026-10-22 01:50 WIB (Codex, C17): added advisory own-side evidence completeness
  via `src/lib/ai/evidenceCheck.ts`, `runAssist` feature `evidence-check`, version
  `evidence-check-v1`. Strict exact-key output covers every known C/I checklist id,
  accepts only known B/S aliases, and downgrades covered without citations to unclear.
  Suggestions are selected from a fixed short vocabulary (at most five), so generated
  names, links and verdict wording cannot enter that text. Input includes locked
  criteria/included items, dispute type and own-side guidance/evidence only; legacy
  no-criteria terms use their condition line. No photo bytes are inspected.
  Buyer/seller-only POST `/api/transactions/{id}/ai/evidence-check` requires an empty
  JSON object, DISPUTED and an open evidence window. Durable reservations in the
  existing idempotency table allow one initial run per side and one per new own
  evidence item, including failed/interrupted runs. Up to 50 own evidence items;
  unsupported/empty checklists use manual guidance. Concurrent requests/reloads and
  the other side adding evidence do not bypass the limit. Results arriving after a
  deadline/status change or own-evidence change are discarded. EVIDENCE_CHECK_RUN
  logs metadata, side/counts and injection flag only, never input or suggestion text.
  No result is saved as a decision/recommendation or read by the rule engine.
  Added a separate EvidenceCompleteness component (no client.tsx growth), matching
  B1/S1 labels on the evidence list, small-screen wrapping and manual fallback.
  Recorded helmet fixtures match full own-side snapshots: empty buyer/seller and
  one specified buyer photo description; unmatched/new evidence does not reuse an
  old finding. Load demo deals, switch to Buyer/Seller, open Road bike helmet >
  Add evidence > Check my evidence for the no-key initial demo. Covered means a
  relevant description was cited, not that the claim was proven.
  `npm test` 337/337 (37 files), typecheck, build passed. Regression tests cover roles,
  ids/body limits, status/window/rate/concurrency, side isolation, metadata-only audit,
  injection, replay, invalid/provider fallback and identical R4/R5 recommendations
  with/without the check. Production Chromium with a fresh temp DB, simulated PayPal
  and replay: 390/1440px light/dark, no overflow or console errors/warnings; tested
  initial/cited replay, rate persistence, visible injection/unavailable, continued
  evidence submission, seller isolation and closed/reviewer gates. All read-back
  audit chains verified. DESIGN 6.1 documents behavior and replay/rate limits.
  No dependencies; rules/state machine/PayPal calls/shared assist.ts unchanged.
  Claude's paypalDisputes.ts, drafts*, OutboundDrafts.tsx and dispute panel untouched.
  Live-provider verification remains pending. Pushed `feat/c17-evidence-check`;
  GitHub API returned 403 Forbidden when creating the PR. English PR body is ready
  at `/tmp/c17-pr-description.md`; open one PR for Claude review, do not merge.

- 2026-10-22 02:25 WIB (Claude): recorded the owner's license plan (MIT now, Apache-2.0
  before the repo goes public).
- 2026-10-22 01:55 WIB (Claude): README FAQ gains "Isn't sending hard cases to a person
  inefficient?" (owner asked to add it now and will re-read everything before the demo);
  corrected the stale bias-test FAQ counts (62 cases: 10 reviewed, 40 accepted, 12 drafts).
- 2026-10-22 01:31 WIB (Codex, C16): implemented the terms assistant using
  `runAssist` feature `terms`, promptVersion `terms-v1`. Seller-only POST
  `/api/ai/terms-draft` accepts only `text` (1-4,000 characters after nonempty
  validation), returns draft/meta/injection warning and an authenticated receipt,
  and creates no deal. Exact four-field schema: item <=200, condition <=120,
  1-12 included items <=60 each, 1-12 photo criteria <=120 each; aggregate JSON
  <=3,000 UTF-8 bytes keeps receipts/submissions within existing request limits.
  Rejects price/currency/URL/contact patterns and detected speaker/common personal
  name forms; this content screening is conservative heuristics, not a complete
  entity recognizer. Human checking is still required. Two synthetic phone/camera
  replay samples are available without keys; unmatched replay text falls back to
  manual entry. Invalid output/provider errors also keep the manual path usable.
  New TermsAssistant/NewDealForm/TermsChecklist components provide preview,
  explicit use/edit, manual-field restoration (price kept), and buyer-visible
  included items/checks before acceptance. Moved the old form out of client.tsx.
  Creation verifies the stateless HMAC receipt and compares submitted item/terms
  against its original fields; TRANSACTION_CREATED payload records feature, mode,
  model, promptVersion, promptHash, outputHash, accepted unchanged/edited and the
  input-injection flag directly. Price is manual and excluded from the comparison.
  Neither pasted source nor receipt is persisted/logged. Receipts last two hours;
  the signing key lives only in server-process memory, so restart/multiple workers
  require regeneration or manual entry (local demo scope, no new env/key file).
  Buyer acceptance/locking, rules and PayPal calls are unchanged. No dependencies.
  `npm test` 278/278 (33 files), typecheck, build and diff check passed. Production
  Chromium, fresh temp DB/replay mode: 390/1440px light/dark, both samples, preview
  before apply, unchanged/edited audit, buyer checklist, no price autofill,
  manual fallback/restoration and visible injection warning: no overflow or console
  errors/warnings. Signing code was absent from client chunks. Real live-provider
  call remains pending. Claude's drafts*, PayPal dispute panel and shared assist.ts
  were untouched. PR creation remains blocked by GitHub API proxy 403; prepared
  English description: `/tmp/c16-pr-description.md`. Branch is for review, no merge.

- 2026-10-22 01:55 WIB (Claude): AI assist #4 outbound drafts. `src/lib/ai/drafts.ts`
  (validators, cite-or-drop timeline, B/S evidence aliases, replay drafts for demo deals),
  `ai_drafts` table, draft and courier-claim endpoints, approved note on the PayPal
  evidence/message action with unchanged/edited audit, UI in `src/components/OutboundDrafts.tsx`.
  251 tests, typecheck, build; browser check (simulated + replay) at 390px light and 1440px
  dark: draft, edit, PDF download, message send, audit titles; no console errors. Next for
  Claude: #5 translation after Codex C18 is merged.
- 2026-10-22 01:15 WIB (Claude): owner approved AI assist features 1-5 (DESIGN 6.1).
  Added the shared guard-rail helper `src/lib/ai/assist.ts` (+ tests) and the work split.
- 2026-10-22 01:20 WIB (Claude): reviewed and merged C14 (#37, bounded dispute polling and
  security review) and C15 (#38, 12 draft shipping/return eval cases). C15's state machine
  edit is import extensions only. Fixed a merge leftover: eval/harness.ts had two report
  templates (C12 wording vs C15 caveats), so eval/report.md showed duplicated metric rows;
  kept C15's template with C12's "Magnitude" wording and regenerated the report. main: 235
  tests, typecheck and build pass. Owner to review with Claude: the 12 new draft labels,
  especially shipping_unknown_destination_unclear and return_wrong_destination_unclear
  (label says human review, the system waits).
- 2026-10-22 00:57 WIB (Codex, C15): added `eval/cases/shipping.json` with
  12 synthetic cases (5 buyer-right, 5 seller-right, 2 unclear), all labelled
  `draft, needs owner review` with one-line rationales and Alice/Bob Example names.
  Covers missed/not-yet-due shipping deadline, pre-order tracking, wrong/unknown
  destination, delivered versus in-transit, buyer confirmation/inspection expiry,
  and delivered/late/in-transit/wrong-destination returns. Extended eval-only facts
  to reach R1-R3 and existing pure RETURN_REQUESTED transitions; added VOID/WAIT
  expected labels so authorizations and waiting are not misreported as refunds.
  State-machine code is unchanged apart from `.ts` import extensions needed by
  Node's existing eval runner. Existing 50 cases, labels, replay summaries and rule
  engine are byte-for-byte unchanged. New facts-driven cases need no new replay
  summary; no live provider/PayPal call or dependency was added.
  `AI_MODE=replay EVAL_K=3 npm run eval`: 62 cases, 10 individually reviewed /
  40 accepted drafts / 12 new drafts; 25/62 escalate, 35/37 non-escalated agreement,
  no variant flips (0/372), repeat consistency 124/124, false release/refund 0/28
  each and injection avoidance-of-review 0/10. Two new draft disagreements are
  preserved for owner/Claude: unknown destination requests human review but R2
  waits; wrong return destination requests human review but the existing guard
  rejects delivery and leaves it waiting. Report and results JSON refreshed with
  replay/small-sample/draft caveats and VOID/WAIT metric limits. `npm test`
  (205/205, 27 files), typecheck and diff check passed; adapter tests cover facts,
  counterfactual invariance, misleading AI, malformed facts and return boundaries.
  Branch `eval/c15-shipping-cases`; English PR description with both explanations
  is at `/tmp/c15-pr-description.md`. PR creation remains blocked by the environment
  proxy denying GitHub API access (403); no merge.
- 2026-10-22 00:50 WIB (Codex, C14): reviewed bridge sync/evidence/escalate/
  simulate and tick polling: role/reviewer gate, streamed body/field validation,
  case/capture/mode matching, local idempotency reservations, audit/error redaction
  and evidence PDF string escaping. Updated SECURITY-REVIEW with findings and limits.
  Fixed unbounded polling: named constants default to a 180-day discovery window
  based on audited capture time (legacy creation fallback) and a hard 50 combined
  list/detail reads per invocation. Owner selected hard cap plus prioritized,
  rotating known open cases; these bypass age, including verified-webhook-only IDs.
  Persisted case/capture attempt order survives context recreation, tied clocks and
  provider failures. Deferred work is marked in results; repeat sync/tick to continue.
  Added an existing-DB-safe operational scheduler table/index; audit chains and
  rules/state transitions remain unchanged. DESIGN documents OAuth/other tick calls
  being outside the dispute-read budget, backlog behavior and policy limitations.
  `npm audit` and `npm audit --json`: 0 vulnerabilities; no upgrades/dependencies.
  Added window/boundary/mode/budget/rotation/webhook tests and route regressions for
  all reviewer gates, input/body limits, safe error/audit data and literal PDF text.
  `npm test` (208/208, 27 files), typecheck, build and diff check passed. No real
  Sandbox calls. Branch `sec/c14-bridge-review`; one PR intended for Claude review,
  not merge. GitHub API access remains blocked by the environment proxy (403);
  English PR description is at `/tmp/c14-pr-description.md` for manual creation.
- 2026-10-22 01:00 WIB (Claude): reviewed and merged Codex work: Home/Menu polish (#33),
  C12 docs accuracy pass (#34; Home footer conflict resolved by keeping the newer polish
  footer), C13 plain-English PayPal dispute labels (#35). main: 212 tests, typecheck and
  build pass; simulated browser check at 390px light and 1440px dark is clean. Next for
  Codex: C14 (security review of bridge endpoints, polling scope), then C15 (draft R1-R3
  eval cases for owner review).
- 2026-10-22 00:39 WIB (Codex, C13): added pure `paypalDisputeLabels.ts`
  display mappings for known status, stage, reason, action and bridge event codes;
  unknown values (including prototype-like keys) fall back unchanged. Deal/review
  panels share the short labels, retain original codes in title attributes, and
  list offered actions individually with natural word wrapping. PayPal bridge
  audit titles use the same mapping and retain the original event type as a title.
  Constrained review grid children and audit text so long values can shrink/wrap.
  No colors, typography, dependencies, business rules or PayPal behavior changed.
  Mapping/render tests cover known codes, unknown/prototype fallbacks, raw-code
  retention and injection-like text escaped as data. `npm test` (212/212, 28 files),
  typecheck, build and diff check passed. Fresh temp DB, simulated mode, Menu demo
  loading and simulated case opening/escalation/PDF submission checked in Chromium:
  deal/review/audit at 390/1440px, light/dark, inquiry/claim/supporting-info phases
  (36 combinations), plus reviewer panel: no overflow or console errors/warnings.
  Branch `ui/c13-dispute-panel-labels`; PR creation remains blocked because the
  environment proxy denies `api.github.com` (403). English description prepared
  at `/tmp/c13-pr-description.md` for owner/Claude to create one review PR.
- 2026-10-21 23:54 WIB (Codex, C12): aligned README, DESIGN, Sandbox notes,
  About/Fairness copy and shared disclaimers with current main, R5 damage/missing-parts
  handling, PayPal dispute bridge PR #31, 10 individually reviewed labels / 40
  accepted drafts, and all committed replay metrics (23/50 escalations; no base
  mismatch). Removed the resolved five-label conflict from Still open. Corrected
  stale seed count (12), blank EVAL_K default, payout/camera/second-reviewer claims,
  audit hashing/manual checkpoint publication, return/external-resolution wording,
  and probe success versus pending integrated Sandbox/live checks. Scanned all
  tracked text for claim-rule terms; remaining matches are AGENTS prohibitions,
  CSS positioning and the preserved SIL font license. Evaluation output/comment
  wording only clarifies the mathematical difference between rates; numbers and
  labels are untouched. No behavior/dependency changes. `npm test` (195/195),
  typecheck, build and diff check passed. Production Chromium checked About/Fairness
  at 360px, current label/metric text, no overflow or console errors/warnings.
  Branch: `docs/c12-accuracy-pass`. Complete English PR description prepared at
  `/tmp/c12-pr-description.md`; GitHub API access is blocked by the environment
  proxy (403), so PR creation needs API access or a manual action by the owner/Claude.
- 2026-10-21 22:39 WIB (Codex, owner-requested Home/Menu polish): branch
  `codex/home-menu-polish` from latest main. Replaced the empty Home's zero-value
  hero/stats and empty list with a role-aware getting-started card. Kept New deal
  as the primary page action, made desktop New navigation neutral, shortened the
  action-empty message, and condensed Sandbox details into a badge and Limitations
  link. Menu groups demo controls/data into one divided settings card and separates
  About & transparency links; selected segments use an explicit token border.
  Existing colors, font, mobile navigation, APIs and business logic retained.
  No dependencies added. `npm test` (195/195), typecheck and build passed.
  Production Chromium checked Home/Menu empty and seeded at 360/1440px in both
  themes (16 combinations), demo loading, role and appearance switching: no
  horizontal overflow or console errors/warnings. Updated UI guide to match.

- 2026-10-21 22:45 WIB (Claude): reviewed Codex C11. Merged `main` (R5) into the branch;
  only HANDOFF conflicted. Tests 195/195, typecheck and build pass. Browser check in
  simulated mode on a seeded completed demo deal: buyer opens a SIM case (deal freezes),
  seller sends the inquiry message, escalation asks for confirmation, then the PDF is sent;
  audit shows DETECTED, EXTERNAL_DISPUTE, MESSAGE_SENT, ESCALATED, EVIDENCE_SENT, all
  marked simulated. 390px light and 390/1440px dark: no overflow, dialogs or console
  errors. Pending for the owner: one integrated run on the real Sandbox.
- 2026-10-21 22:35 WIB (Claude, owner-approved "R5"): disputes typed "damaged" or
  "incomplete" always go to a person (rules engine, review pipeline, eval harness). Eval
  cases now carry the dispute type and shipping facts (other_parcel_buyer: wrong
  destination, so R3 fires). Replay: 5 accepted-draft labels now differ (seller-side damage
  and partial cases and both accessory cases escalate). The owner reviewed those five one by
  one and set all to "human" (eval/owner-label-review-2026-10-21-r5.json). Labels: 10 of 50
  reviewed individually, 40 accepted drafts. Replay: 0 cases differ, 23/50 escalate.
- 2026-10-21 22:20 WIB (Owner + Claude): owner reviewed the 5 grey eval cases (4 -> human,
  ship_date_buyer -> agree) and chose to accept the other 45 drafts without individual
  review; recorded as distinct statuses ("reviewed by owner" / "draft accepted by owner").
  `eval/owner-label-review-2026-10-21.json` holds the review. Replay result: 4 cases differ
  (system refunds where the owner expects a human): our rules do not escalate damage,
  partial delivery, wrong destination or seal tampering found only in dispute evidence.
  Open for the owner: let R5 use the dispute type (needs approval, rule change).
- 2026-10-21 22:17 WIB (Codex, C11): built the owner-approved PayPal dispute
  bridge on `codex/c11-dispute-bridge`. Added the existing-DB-safe
  `paypal_disputes` table/repository, capture-scoped polling from reviewer sync
  and tick, and shared case identity with verified webhooks. Existing external
  freeze/resume transitions run once; stale open results cannot reopen a resolved
  case, and other open cases keep the deal frozen. Seller/reviewer evidence
  submission checks locked terms, audited evidence hashes and chain integrity,
  builds a one-page text PDF, or sends an inquiry message when that is all PayPal
  offers. Escalation requires an in-page confirmation and current PayPal permission.
  Added deal/review panels, audit titles, SIM- cases with persisted metadata, and
  a clearly labelled demo opener on completed demo deals. Reused the existing
  rules, state-machine transitions, and PayPal client methods. No dependencies added. README/DESIGN explain
  polling, stage limitations, text-only PDF, and blocked interrupted sends.
  `npm test` (190/190), typecheck, and build passed. Browser tested simulated
  open -> message -> cancel/confirm escalation -> PDF, both panels, 390/1440px
  light/dark: no overflow, browser dialogs, or console errors. Fake tests cover
  polling/webhook order, resolution, roles, migration, PDF content and failures.
  Integrated real Sandbox run remains pending for the owner; the separate client
  probe's successful real run is documented in SANDBOX-NOTES.
- 2026-10-21 22:00 WIB (Owner + Claude): Disputes API probe on Sandbox dispute
  PP-R-OIU-10193936 succeeded after three instructive refusals (see SANDBOX-NOTES):
  evidence PDF accepted with type OTHER after the seller escalated to a claim. Next (needs
  owner approval): app integration (detect PayPal disputes by polling, freeze, send locked
  evidence from the deal, show status).
- 2026-10-21 21:45 WIB (Claude, owner asked to try Disputes API): branch
  `feat/disputes-probe`. PayPalClient gains listDisputes, getDispute, provideEvidence
  (multipart PDF or JSON), sendDisputeMessage, and Sandbox-only sandboxRequireEvidence /
  sandboxAdjudicate (refuse non-Sandbox hosts). `src/lib/evidencePdf.ts` builds a one-page
  PDF without a library. `npm run dispute-probe` (owner-run): capture, buyer opens dispute
  by hand, list/show, send evidence, adjudicate. App integration waits for the probe result.
- 2026-10-21 17:25 WIB (Owner + Claude): owner ran `npm run smoke` on Windows. Both paths
  pass: capture (fee 0.64 on 10.00), tracking accepted with carrier OTHER, refund
  COMPLETED; void VOIDED. Recorded in docs/SANDBOX-NOTES.md and README section 5.
  Next: owner label review, live-model eval, app click-through on the real Sandbox.
- 2026-10-21 17:55 WIB (Claude): README FAQ answers for review items 7-11, 14, 15 (PR #20);
  owner decisions recorded: 1.5% seller fee (docs only), split stays recorded-only, name
  stays HalcyVault for now (decide before the video).
- 2026-10-21 17:30 WIB (Claude, owner-approved "fix 1-6"): (1) return before refund:
  new status RETURN_REQUESTED, RETURN_DELIVERED / RETURN_DEADLINE_PASSED triggers,
  return_by/return_tracking columns with a migration that widens the status check,
  POST /api/transactions/{id}/return, reviewer can waive (default waived for
  not_received), RETURN_DAYS default 3, seed shows a completed and a pending return;
  (2)+(4) README "Threat model and FAQ"; (3) owner label review support
  (`npm run labels:apply`), report and Fairness page state reviewed counts and limits;
  (5) deal page shows PayPal honor period and capture failures; (6) optional
  REVIEWER_ACCESS_CODE. Owner still decides 7-16 (see chat list).
- 2026-10-21 15:55 WIB (Claude): reviewed and merged Codex C6-C10 (decision hashes, signed
  audit checkpoints, audit CSV export, seeded resolved dispute, README screenshots).
  Resolved import conflicts between C6 and C8. Fixed: seeded decision now records
  termsHash/evidenceDigest like the review API; status pill no longer wraps in page
  headers; audit list hides per-deal checkpoint lines when no checkpoint exists. Retook
  docs/ui/screens at phone viewport. 152 tests, typecheck, build; Chromium check of
  receipt, audit, CSV export, fairness, no console errors. No checkpoint has been
  published yet: the owner runs `npm run checkpoint -- --generate-key` once, keeps the
  private key in .env, then `npm run checkpoint`.
- 2026-10-21 15:26 WIB (Codex, C10): captured 11 current-app PNGs under
  `docs/ui/screens/` using production Chromium automation, `PAYPAL_MODE=simulated`,
  replay AI, and a fresh temp SQLite database seeded through Menu. Nine light
  mobile images are exactly 390x844; dark buyer-home/reviewer-review images are
  1440x900. Covered deals, Phone checklist, completed detail, damaged-dispute
  guidance, review, decision receipt, audit, and fairness. Latest main did not
  yet include C9, so the guidance/receipt states were prepared through the demo
  dispute and reviewer UI. Only synthetic data is shown. Replaced README's old
  image reference and added the Screens link table. Production build passed;
  all PNG dimensions, links, sizes (50-129 KiB each, 738 KiB total), and console
  checks passed. No code or package changes; browser automation was not added
  as a dependency.
- 2026-10-21 15:20 WIB (Codex, C9): added an eleventh labelled demo deal,
  "Damaged smartwatch (resolved)", with both parties' evidence, a replay-backed
  recommendation, and a human REFUND decision/reason through the orchestrator;
  it ends VOIDED because the payment was only authorized. Disputed, under-review,
  and resolved demo cases record `damaged` on OPEN_DISPUTE. Existing smartwatch
  replay data suffices; no new replay case was needed. Seed now adds missing
  examples without replacing existing deals, so earlier demo databases receive
  the new receipt too. README count updated. `npm test` (125/125), typecheck,
  and build passed; browser Menu seeding added one missing deal and its receipt
  displayed the reason, evidence, and verified audit chain without console
  errors. No dependencies added.
- 2026-10-21 15:06 WIB (Codex, C8): added GET `/api/audit/:id/export` for all
  demo roles and an "Export CSV" button on each audit log. CSV contains sequence,
  timestamp, actor, type, simulated flag, previous/current hashes, and canonical
  JSON payload. Fields are quoted with doubled quotes and CRLF record endings;
  formula prefixes (including after whitespace) get a leading single quote.
  Export does not mutate stored events or their hashes. Tests cover escaping,
  formula injection, all roles, event row counts, headers, and invalid/unknown
  IDs (400/404). `npm test` (137/137), typecheck, and build passed. Production
  browser download checked at 360px: correct filename/header, no overflow or
  console errors. No dependencies added.
- 2026-10-21 15:00 WIB (Codex, C7): added `npm run checkpoint` to verify all
  audit chains in one SQLite snapshot and sign canonical head manifests with
  Ed25519 using only `AUDIT_SIGNING_KEY` from the environment. The explicit
  `--generate-key` command prints a pair once and writes only the public key;
  the committed bootstrap public key has no retained private half and must be
  replaced locally before first use. Verifier detects unchanged, extended,
  rewritten, missing, and newly uncheckpointed deals; `/audit` shows checkpoint
  results or a plain missing/invalid-file message. README and DESIGN explain
  publishing and the need to retain an independent trusted checkpoint/key.
  No operational private key or checkpoint was committed. Tests generate
  throwaway keys and cover tampering, wrong keys, CLI output, and refusal to
  sign broken chains. `npm test` (128/128), typecheck, and build passed; final
  build has no tracing warnings. Production `/audit` checked at 360/1440px in
  light/dark: no overflow or browser console errors. No dependencies added.
- 2026-10-21 09:14 WIB (Codex, C6): bound recommendation and human decision audit
  events to canonical `termsHash` and an ordered `evidenceDigest` (evidence IDs,
  parties, kinds, and SHA-256 content hashes). RELEASE, REFUND, and SPLIT record
  current hashes and flag evidence changed since the recommendation. The decision
  receipt shows both full recorded hashes and compares them with current data;
  older receipts without hashes say "Not recorded". Added digest unit tests and
  route/receipt tests for all outcomes, including evidence changes before a
  decision and terms/evidence changes afterwards. `npm test` (131/131),
  `npm run typecheck`, and `npm run build` passed. No dependencies added.
- 2026-10-21 06:29 WIB (Codex, C5): wrote `docs/RECONCILIATION.md`, a
  documentation-only proposal for resolving PayPal actions left pending after a
  crash. It maps read-only checks for orders, authorizations, captures, voids,
  refunds, and tracking; defines evidence needed before applying or replaying an
  action with the same request ID; and proposes audit events, reviewer controls,
  and unit/Sandbox tests. It marks persistence, reviewer-triggered replay, and
  any state-machine change as requiring owner approval under `AGENTS.md`.
  Existing Sandbox notes do not establish same-ID replay or resource recovery.
  No code, dependency, or live PayPal call was changed or made.
- 2026-10-21 05:36 WIB (Codex, C4): seeded `COMPLETED` demo deal now calls the
  existing tracking helper after buyer confirmation. Its PayPal stub returns a
  `DEMO-TRACKER` id, and the `PAYPAL_TRACKING_ADDED` audit event has
  `simulated: true`, so the audit screen shows "Tracking sent to PayPal" as a
  simulated step. Tests check the event follows capture, its label and tracker
  id, and every demo chain. `npm test`, `npm run typecheck`, and `npm run build`
  passed. No dependencies added; state machine, rules, and tracking helper are
  unchanged.
- 2026-10-21 06:05 WIB (Claude, owner-approved "1-4"): merged Codex C1-C3 (PR #14). Added
  `/fairness` (eval writes `eval/results.json`; empty `EVAL_K` now defaults to 3), decision
  receipt `/deals/[id]/decision` (+ `loadDecisions`), item-type checklist templates
  (`src/lib/termsTemplates.ts`), dispute types with evidence guidance
  (`src/lib/disputeTypes.ts`, optional `type` on POST dispute). Rules unchanged. 123 tests,
  typecheck, build; Chromium walk-through of all four at 360/390/1440px, no console errors.
  Next owner-requested batch "CloneIDE": decisions bound to terms and evidence hashes,
  signed head hash published outside the server, audit CSV export (do only when asked).
  Open for the owner: C3 found light `--muted` contrast 4.43:1 (below AA); token change
  needs approval.
- 2026-10-21 05:18 WIB (Codex, C1): checked README Option A from a fresh clone on
  `codex/c1-readme-check`: `npm ci`, copied `.env.example`, set `PAYPAL_MODE=simulated`,
  and ran `npm run dev`. Browser created a synthetic deal, buyer accepted terms and
  approved simulated payment. Browser automation then raced hydration at the tracking
  step, so the JSON API with `x-demo-role` completed `DEMO-DELIVERED` shipping, buyer
  confirmation (`COMPLETED`), and demo seeding (10 deals). `npm test` passed 110/110;
  typecheck and build passed. `npm run eval` initially failed because the copied
  `.env.example` leaves `EVAL_K` blank; after setting `EVAL_K=3`, replay evaluation
  passed (50 cases). README now documents that value and correctly says the seed
  creates ten main-status examples. No code changes or Sandbox calls.
- 2026-10-21 05:25 WIB (Codex, C2): reviewed all API routes, PayPal webhook,
  user-text rendering, AI evidence quoting, 235 blobs of Git history, and
  `npm audit` (0 reported vulnerabilities). No suspected committed secrets found.
  Fixed streamed request-size enforcement and AI evidence delimiter escaping in
  separate commits, each with regression tests. Wrote `docs/SECURITY-REVIEW.md`.
  Open: demo role header/cookie is not authentication; real Sandbox webhook
  delivery still needs owner testing. `npm test`, `npm run typecheck`, and
  `npm run build` passed on this branch.
- 2026-10-21 05:31 WIB (Codex, C3): ran the app with `PAYPAL_MODE=simulated`,
  loaded demo deals through Menu, and checked Home, Deals, New deal, deal detail,
  checkout, evidence, review, audit index/detail, Menu, About, and simulated
  approval at 360px and 1440px in light and dark. Also checked seller, buyer, and
  reviewer form states. Fixed mobile overflow from deal cards, clipped deal/audit
  text, undersized Home and desktop brand links, and keyboard focus on textareas
  and selects. Rechecks found no horizontal scroll, clipped text, unlabeled
  inputs, undersized interactive targets, or browser console errors/warnings.
  Remaining: approved light-theme `--muted` token contrasts at 4.43:1 on `--bg`
  and 4.34:1 on `--surface-2`, below the 4.5:1 text target; token colors were not
  changed under the C3 constraint. `npm test`, `npm run typecheck`, and
  `npm run build` passed. No dependencies added.
- 2026-10-21 02:55 WIB (Claude): recorded owner decisions (fee on refund: platform;
  deadlines 3/2/2; hosting later) in UI, README, DESIGN, UI.md, .env.example. Earlier this
  session: PR #11 marks simulated events in the audit log.
- 2026-10-21 02:45 WIB (Claude): PayPal tracking after capture (owner approved). Docs say
  `/track` needs a captured order, so it runs after capture, not at shipping. Unknown until
  the owner runs `npm run smoke` (path b): whether the Sandbox accepts a made-up number with
  carrier OTHER. Also published a label-review page and a video/Devpost draft (outside the repo).
- 2026-10-21 02:45 WIB (Claude): merged PR #8 (simulated PayPal mode) after verifying main
  (106 tests, typecheck, build). Rewrote README for judges on `docs/readme-judges`; every
  statement checked against the code, claim-rule wording scanned.
- 2026-10-21 02:30 WIB (Claude): merged PR #7 (UI screens) after verifying main. Built the
  simulated PayPal mode on `feat/demo-paypal-mode` (owner approved the plan: demo mode
  first, then README). No new dependency. Checks listed under Current status.
- 2026-10-21 02:00 WIB (Claude, Prompt 9 while Codex was out of quota): built the UI
  screens on `feat/ui-screens`. Added `listTransactions`/`listAcceptances` to the
  repository, `src/lib/demoSeed.ts` (+ tests) and `POST /api/demo/seed`, pure view helpers
  in `src/components/view.ts` (+ tests), client actions in `src/components/client.tsx`.
  The PayPal return URL now points to the UI page `/paypal/return`, which calls the
  existing API route. Added a replay case so the seeded dispute shows AI findings.
  Checked: npm test, typecheck, build; Playwright walk-through of every screen at 390px in
  light and dark and at 1280px: no console errors; flows tested: create deal, ship,
  add evidence, split (pending), pay without keys (friendly error).

- 2026-10-21 (Codex): created `feat/ui-foundation` from the latest `origin/main`.
  Added exact light/dark tokens mapped to Tailwind 4, pre-paint theme selection with
  guarded localStorage, self-hosted Plus Jakarta Sans through `next/font/local`, all
  section 6 components, and a two-theme `/styleguide`. The font is bundled under its
  OFL license because the build environment cannot reach Google Fonts. No dependency
  was added. `npm test` (89/89), typecheck, and build passed; the local styleguide
  rendered in Chromium and theme persistence was checked.
- 2026-10-21 (Codex): wired the AI evidence summary and deterministic rules into
  review preparation on `feat/review-pipeline`. Recommendations are stored once with
  audit events; GET exposes them, and reviewer POST keeps the money-moving gate.
  Provider failure and injection escalate; SPLIT is a reasoned pending decision with
  no payment call. No new dependencies or live provider calls. Verification:
  `npm test` (94/94), `npm run typecheck`, and `npm run build` all passed.
- 2026-10-21 01:20 WIB (Claude): integrated the Codex branches. They had been created from
  `main` before the app scaffold was merged and were stacked on each other, so they were
  merged into `integrate/codex-batch` (eval + webhook + sandbox-smoke + app-scaffold).
  Conflicts were additive and resolved by keeping both sides; kept the integrated
  `db.ts`/`tsconfig.json`/`next.config.ts`, added Tailwind and the app shell from the
  scaffold, dropped the scaffold's old `db.test.ts` (it targeted the earlier schema without
  `seq`), fixed one test type error that broke `next build`, rewrote this file.
- 2026-10-20 (Codex): six tasks on separate branches: orchestrator, sandbox smoke, API
  routes, PayPal webhook, AI evidence summary, evaluation harness. No live PayPal or AI
  calls; no new runtime dependencies (vitest 5 / vite 8 as dev tools).
- 2026-10-21 00:50 WIB (Claude): UI guide and mockups (PR #3).
- 2026-10-20 (Codex): Next.js + Tailwind scaffold and SQLite schema (PR #2).
- 2026-10-20 (Claude): core domain (PR #1); project docs, agent instructions, license.

---

Current continuation summary: the UI, AI review preparation, owner-approved R5
dispute types and PayPal dispute bridge are on main. Smoke and the separate dispute
probe passed in the owner's Sandbox. Integrated Sandbox UI/bridge, webhook delivery
and live-model evaluation remain pending. Labels: 10 individually reviewed, 40
accepted drafts; no replay base-case mismatch. See current status and latest logs.
