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
name **Creident** (owner decision 2026-10-22; formerly HalcyVault), narrow scope (`docs/DESIGN.md`). Repo `Ilham-Musyafa/Creident` (renamed from HalcyVault 2026-10-22)
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

## Active agents (2026-10-22 16:30 WIB)

**FEATURE FREEZE** since 2026-10-22: C18-C22 merged. No new features; new ideas go to README
section 7 as production path. Remaining work, in order (Claude unless noted):
1. Public-demo hardening: rate limits per IP on write and AI endpoints, security headers,
   public server locked to PAYPAL_MODE=simulated + AI replay, demo data re-seeded on start,
   SECURITY-REVIEW update for the AI and oversight endpoints.
2. Lighthouse / bundle-size check and fixes.
3. Render deploy (owner creates the account and claims the $50 credits) + Render Workflow
   for the deadline tick and dispute polling.
4. Full end-to-end QA pass (all roles, 390/1440, light/dark) and README screenshots.
5. Owner items: real Sandbox run of the bridge and a partial refund, live-model eval key,
   12 draft shipping labels, name, licence switch to Apache-2.0, AG Studio trial 7-8 Nov,
   Discord question to AG Grid, video, Devpost.

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
   POST records RELEASE, REFUND or PARTIAL_REFUND decisions for disputed transactions; a required return
   defers the money call. SPLIT remains recorded-only by owner decision (2026-10-21);
   SPLIT execution is deferred; the separate C19 PARTIAL_REFUND flow is implemented
   on its review branch, pending Claude review.
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
- Public name: DECIDED 2026-10-22, **Creident** (owner's own idea; owner reports the .com domain
  is available). Replaces HalcyVault in UI, README, docs, PDFs and PayPal notes. Quick web check
  found no product with the same name (nearest: Credent Insurance, CRED fintech). Say the name
  clearly once in the video. Render service name: `creident` (creident.onrender.com).
  GitHub repo renamed by the owner to `Ilham-Musyafa/Creident` (old URLs redirect).
  Not renamed on purpose: internal CSS/cookie prefixes `hv-`, concept mockup PNGs in
  docs/ui, and history in this log. `HALCYVAULT_DB_PATH` still works as a fallback for
  `CREIDENT_DB_PATH`; the default DB file is now data/creident.sqlite (an old local
  data/halcyvault.sqlite is left untouched).
- Hosting / public demo link: DECIDED 2026-10-22, Render (sponsor tool). Start on the free
  plan; optionally upgrade to the ~$7/month instance during judging to avoid the ~1 minute
  cold start; final choice before submission (do not change the URL after submitting).
  Public server runs PAYPAL_MODE=simulated and AI replay only (no PayPal or AI keys on the
  public server), re-seeds demo data on start, Node 22+. Do this after the feature freeze,
  together with the public-demo hardening (rate limits, security headers, SECURITY-REVIEW
  update for the AI endpoints) and a Lighthouse/bundle-size check.
- Sponsor tool: DECIDED 2026-10-22, AG Studio (AG Grid's embedded analytics library; the
  AG Grid prize page asks for AG Studio dashboards with custom widgets, theming and layout,
  and encourages the Studio Agent Framework). Plan: one reviewer "Oversight dashboard"
  (dispute and escalation counts, AI draft unchanged/edited/ignored statistics, a custom
  audit-chain widget, deadline queue, app theming; optional read-only Studio agent that
  cannot act). Build without a key first (AG Studio allows local evaluation; watermark and
  console warnings until licensed). Results are announced 21 Dec 2026, so the owner registers
  the free 45-day trial (name + email, no card) on 7-8 Nov (expires ~22-23 Dec) and keeps the
  key in .env; record dashboard video shots after that. Also ask AG Grid on Discord for an
  extension through judging. Before using it on the public demo,
  ask the AG Grid team on the PayPal Discord whether the trial key may be used in a public
  demo/open-source repo and lasts through judging. Fallback: AG Grid Community table page.
  Large commercial dependency: approved by the owner for this purpose only.
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

### 2026-10-31 — Lead session: UI fixes after owner testing on Render (all UI/copy only)

- Merged: #103 Deal history out of main nav, #104 public-origin fix (Render "localhost:10000"),
  #105 docs idea (join a deal by short code, post-hackathon only), #106 seller can copy the
  buyer link again, #107 dates and calmer status colours in Transactions, #108 step-complete
  check shown for every finished step, #109 favicon + Confirm warning, #110 newest-first
  deal lists + new blue check animation (inline SVG/CSS from the owner's Lottie file, no
  dependency), #111 lighter H1 Home redesign (desktop greeting panel + next-step card + deals
  table; mobile summary card), #112 wider content area on large screens (cap 1560px, footer at
  the bottom), #113 seller dock: New deal centred, How it works as fifth item.
- Skipped from the H1 prompt on purpose: sidebar changes and dark-mode colour changes
  (deferred until after submission), 1920px screenshots. Empty-state "How it works" list is
  untested visually (demo mode auto-seeds deals on first load).
- Still open: C29 (evaluation changes, waits for the owner's command); C32 final
  screenshots + README links; demo script and video; Devpost; make repo public. Owner to
  retest the full flow on creident.onrender.com (incl. dispute path with Reviewer).
- Docs: HANDOFF shortened (older log moved to `docs/archive/`); added `docs/WORKFLOW.md` (token-saving rules) and `docs/templates/TASK.md` (task template). Nothing was deleted.
- Known: PR #73 (unused logo study) not closed by the owner yet; do not delete its branch.

### 2026-10-30 — Lead session: merges, owner decisions and queue

- Merged to main today: #89/#90 brand kit, #91 C26 submission polish, #92 C27 plain
  language, #93 C28 Home polish, #94 C30 categories, #95 C33 plain-language About and
  Fairness, #96 C31 New deal follow-up, #98 C34 menu cleanup. main e60078e: typecheck
  pass, 549 tests/53 files.
- C31 (Codex, #96): Condition is now a required select (New / Used - Like New /
  Used - Good / Used - Good Enough); an AI-draft condition is mapped to an option or
  shown as "The AI draft said: ...". Deal summary shows Category / Subcategory. Price
  helper text added (`src/components/newDealPresentation.ts`). No schema/API/rule change.
- C34 (harness, #98): removed the duplicate Limitations entries from Menu, mobile
  Settings and desktop navigation (unused icon removed). Limitations stays in both Home
  footers and as the last section of /about (#limitations). Report with screenshots:
  docs/ui/screens/menu-limitations-cleanup/. Known small bug for C35: desktop sidebar
  lights Settings on /how-it-works (and /reviewer/oversight) because pageInfo returns
  selected 'Menu'; should be null.
- C33 (harness, #95): About restructured into six plain sections (anchors
  #decisions, #audit, #limitations kept; R1-R7 accordion removed, it lives on
  /how-it-works; all eight limitation points kept). Fairness wording and labels
  simplified; every number still read from eval/results.json. Wording only.
- Owner decisions: license stays MIT; UI language stays English for the hackathon,
  Indonesian later; Creident name locked; Render hosting; Check-C wordmark is the logo.
  New deal: 18 categories with subcategories (taxonomy in `src/lib/dealCategories.ts`,
  incl. Sports & Fitness) and the four condition options above.
- Eval label decisions (owner + partner, accepted by Lead): keep case 11 label; keep
  31/32; lock 33/34; reword evidence of cases 5/6 while keeping labels; add evidence
  conditions to cases 13/14; README R5 definition must match code (disputeType
  damaged/incomplete, missing/contradictory evidence, no usable summary, unclear
  criterion). Add per-label and per-group scores plus an always-ESCALATE baseline, and
  re-run the eval before writing any number. Not done yet (C29).
- Work split: Codex = UI/design changes; DeepSeek harness = heavy mechanical or
  token-heavy tasks (local app, one task per session); Claude (Lead) = review, claims,
  PR review, evaluation work. One agent per branch; merge in sequence.
- Queue: C29 eval changes; Home/Transactions polish (Completed label wraps, duplicate
  tile rows and Browse button, three filter controls on Transactions); owner dry run
  Seller -> Buyer -> Reviewer; UI freeze; C32 final screenshots and README links
  (Render, YouTube); demo script; video (< 3 min) on YouTube; Devpost.
- Owner idea 2026-10-30 (planned after the hackathon, not built): buyer joins a deal by a
  short code from the seller, besides the link, for a future mobile app. Rules if built: the
  code only opens the same deal page as the link, expires, limits wrong attempts, no new
  access. Needs a data and API change, so it is outside the feature freeze. Recorded in the
  README production-path list.
- Later merges and fixes today: C35 sidebar highlight (#100), C36 QA report (#99), C37 no
  placeholders (#101), C38 polish pack 1 (#102), C39 Deal history out of the main
  navigation (#103), and fix #104: payment return URLs now use the public origin
  (RENDER_EXTERNAL_URL, then forwarded host) because behind Render the pay handler built
  http://localhost:10000 links and the PayPal step opened a dead page.
- Open items for the owner: confirm the Render deploy is live (the agent proxy cannot
  reach it); live-model evaluation needs approval of the AI provider and must never run
  on the public server; Sandbox end-to-end bridge run.
- Hackathon facts (official page): prizes include Best Overall, five $5,000 special
  categories (Most Creative, Most Impactful, Best Demo Delivery, Best Use of PayPal + AI,
  Best Use of Agentic Commerce) and sponsor prizes (Render credits among them). Judging
  criteria are not published. Creident is not an agentic-commerce entry: AI only
  summarises evidence and rules decide; do not claim it.

### Older entries

Entries up to 2026-10-30 (C26–C30, brand kit, logo studies, earlier UI work) are in
`docs/archive/HANDOFF-log-until-2026-10-30.md`. Read them only when a task needs that history.
