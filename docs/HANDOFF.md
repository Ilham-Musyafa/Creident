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

Built (all on `integrate/codex-batch` until merged):
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
  seeded order, injection flag, replay mode by default without a key. On
  `feat/review-pipeline`, it is wired into review preparation at all three paths to
  `UNDER_REVIEW`: evidence complete, evidence deadline, and tracking mismatch. The
  stored recommendation includes the AI summary or null, rule, action, reasons, and
  human-review requirement, plus an audit event. GET `/api/transactions/:id/review`
  reads it. AI failure becomes an R5 human escalation. `SPLIT` with a human reason is
  recorded as pending without moving funds.
- Evaluation (`eval/`, `npm run eval`): 40 synthetic dispute cases + 10 injection cases,
  six counterfactual variants each, report in `eval/report.md`. Labels are drafts that
  need owner review; replay results check the harness and rules, not a live model.
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

Checks on 2026-10-21: `npm test` 110 passed (14 files); earlier: `npm test` 106 passed (14 files), typecheck and build passed; full
simulated flow clicked in Chromium (390px): create, accept, pay, approve, ship, confirm,
audit chain verified, no console errors.

Not verified yet (needs the owner or a public URL): real Sandbox run of the smoke script
and the JSON routes, real webhook delivery, any live AI provider call.

## Active agent

None right now (2026-10-21 15:55 WIB). Codex C1-C10 are merged. `docs/RECONCILIATION.md`
is a proposal only: do not implement it without the owner's approval.

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

1. Owner: run `npm run smoke` on Windows for both paths (void; capture + refund) and record
   the results in `docs/SANDBOX-NOTES.md`.
2. Done: AI evidence summary wired into review preparation (PR #5). Only the human review
   POST executes RELEASE or REFUND for disputed transactions. The owner still needs to
   define the amount and payment treatment of a pending SPLIT decision.
3. Done: the eight UI screens (PR "UI screens"), plus Deals list, About, PayPal return
   page, loading/error/not-found states. Pages read through `src/app/_server.ts`; every
   change goes through the JSON API. Demo deals: Menu > "Load demo deals"
   (`POST /api/demo/seed`, labelled `[Demo]`, simulated PayPal stub, real audit chains).
   Without Sandbox keys, money-moving actions (pay, confirm, decisions) show a clear
   "keys not set" message; non-money steps (ship, dispute, evidence, split) work.
   Done: labelled simulated PayPal mode (`PAYPAL_MODE=simulated`) so judges can click the
   whole flow without keys.
4. Owner: review every evaluation label and rationale; then expand the set toward the
   size proposed in DESIGN section 10 and run once with the chosen live provider.
5. Owner: public HTTPS URL + `PP_WEBHOOK_ID`, then test real webhook delivery.
6. Done (branch `docs/readme-judges`): README for judges. Update section 5 once the
   live-model eval and the owner's `npm run smoke` results exist.

## Decisions

Decided: stack Next.js + TypeScript + SQLite + Tailwind; fund model A (authorize then
capture); license MIT; visual direction Midnight Ink + Mint with light/dark/system
(`docs/UI.md`); coding tools Claude Code and Codex (handoff through this file).

Tentative: AI provider DeepSeek V4.1 Flash via the owner's Hive API key (verify model name,
API terms, strict-JSON reliability, image support).

Decided 2026-10-21: the platform bears the PayPal fee on a refund (buyer refunded in full);
deadlines ship-by 3, inspection 2, evidence 2 days (env-configurable).

Still open:
- Final public name (the word "Vault" suggests custody; temporary, owner will rename later).
- Hosting / public demo link: owner chose "decide later" (after smoke test and video).
- Five draft eval labels conflict with rules R3/R5 (flagged on the label-review page);
  owner reviews before the live-model eval.

## Do not forget

- Deadline: 13 Nov 2026, 03:00 WIB (12 Nov, 12:00 PM PT). Internal target: 11 Nov night.
- Everything for judges must be in English. Demo video under 3 minutes on YouTube.
- Never commit secrets. Sandbox only.
- Avoid forbidden claims listed in `AGENTS.md`.
- Make the repo public before submitting.

## Log

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

Ringkasan singkat (Bahasa Indonesia, untuk Ilham): semua pekerjaan Codex sudah disatukan
dan diuji (89 uji lolos, build lolos). Yang belum: menjalankan skrip uji Sandbox di
komputermu, menghubungkan ringkasan AI ke alur tinjauan, membuat layar sesuai
`docs/UI.md`, dan memeriksa label uji bias.
