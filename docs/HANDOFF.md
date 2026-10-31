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

### 2026-10-31 — README final pass (docs only)
- Branch `docs/readme-final`. Live demo URL filled (https://creident.onrender.com); `<YOUTUBE_URL>` still to fill after upload. Added an "At a glance" Mermaid architecture diagram and a "Where AI is used / not used" table. Test results section brought in line with `eval/results.json` (62 cases; 0/28, 0/372, 124/124, 25/62, 35/37; two cases differ from labels). FAQ: difference from PayPal Goods & Services (no claim of better outcomes) and why physical goods only. Production path: digital assets with verifiable hand-over and milestone services, none built or promised.

### 2026-10-31 — Clarity phase 1: evidence flow and small fixes
- Started `ui/clarity-1` from origin/main `7c61ec1` (PR #135 merged). Phase 1 only; phase 2 has not started and must wait for the phase-1 PR handoff/owner review.
- Seller share card now depends only on DRAFT / TERMS_LOCKED / AWAITING_APPROVAL; created=1 no longer overrides the status. Reviewer outcome buttons stack on mobile and use a weighted row on desktop, with equal measured heights (56px / 64.5px), readable 14px text and at most two lines. Local important utilities override the existing shared min-height/font cascade without changing other buttons or decision behaviour.
- Shared TechnicalDetails is one bordered, keyboard-accessible 44px+ row with an aria-hidden rotating chevron; closed content adds no gap. Existing inline technical sections inside already-open history/case steps remain inline, avoiding extra nested toggles.
- Add evidence is now numbered guidance/code, writing, optional AI check, with deadline/shared evidence list/back link alongside on desktop and stacked on mobile. Code is plain and copyable; textarea is seven rows with examples/count, the existing chat note immediately above it and Submit beneath the field. Required/maxLength 4000/whitespace disable, API payloads, shared list, closed-window/reviewer gates and AI check logic are unchanged. Deadline uses the existing urgency helper for applicable Buyer/Seller actions. All existing demo markers/advisory limitations remain.
- Typecheck, 640 tests / 61 files (four new presentation tests), production build and whitespace checks passed. Two existing assertions were adjusted only for the new summary label/chevron markup, retaining security checks. Playwright covered nine affected pages at 390/1280/2560px, all three roles, light/dark: 162 final views, plus 12 representative baselines. Checked disclosure closure/keyboard/rotation, copy, form count/disable, button heights/line counts, no overflow or console errors/warnings, and Submit dock clearance.
- UI interaction checks passed for photo/chat/note submissions, preserved content hashes, form reset, the existing both-sides-to-review transition, AI one-run gate/reset, confirmation Cancel and seller share gates with created=1 across seeded statuses plus TERMS_LOCKED. QA used only temporary databases in simulated/replay mode. No src/lib, API, schema, payment/AI logic, rules, deadline/hash or production data changes; no dependencies. Before/after table, exact label changes and screenshots: `docs/ui/screens/clarity-1/README.md`.


### 2026-10-31 — Alphabetical category pickers
- Started `ui/category-alpha` from origin/main `2ba2811` (PR #134 merged). NewDealForm now uses the small presentation-only `alphabeticalOptions` helper for both native selects: English locale-aware, case-insensitive label ordering, Other last, placeholders untouched. It sorts a copy and preserves entry identities. DEAL_CATEGORIES source order, ids, labels, hints, templates, stored terms and lookup/legacy helpers are unchanged. Source usage scan found no other category picker/filter requiring an ordering change.
- Typecheck, 636 tests / 60 files (four new helper tests), production build and whitespace checks passed. Tests cover A–Z, Other last, case/accents, empty/fallback lists, source immutability and ids/object identity across the complete taxonomy.
- Production Playwright checked Seller at 390/1280px, light/dark, including all 18 category options and 17 nonempty subcategory lists per view, placeholders, category-change reset, checklist attachment, the Physical items only hint and decimal keyboard attribute. Eight screenshots show genuinely open native dropdowns, captured with existing Playwright/Chromium, Xorg dummy display and ImageMagick (no installed/new application dependency, no replacement picker or UI modification). Screenshots: `docs/ui/screens/category-alpha/`.
- Created one deal through the UI with Video Games & Consoles / Consoles, then verified the unchanged category/subcategory ids and attached checklist in the isolated SQLite terms JSON. Home, Transactions and the deal page show the saved labels correctly at 390/1280px. No horizontal overflow or browser console errors/warnings. QA data lives only in /tmp; Render data/configuration is untouched.


### 2026-10-31 — Desktop Home activity and demo guide
- Started `ui/home-activity-demo` from origin/main `e5524b5` (PR #133 merged). Added Recent activity and Try the demo directly below Your deals: 32px block separation, 28px card padding, equal columns from 1440px and stacked at narrower desktop widths. Existing Home cards and MobileHome are unchanged; no animations, new dependencies, routes, API or business-logic changes.
- `recentHomeActivity` uses existing server-side repository events and the deal Activity `activityFeed` labels/omissions. It sorts by stored timestamps before limiting to five and uses the existing relative-time formatter. Buyer/Seller use their existing demo party IDs; Reviewer can read all deal pages under the current prototype's read visibility. Hidden-party events are not read by this helper. No new access is granted, and only plain event labels/item names/timestamps are displayed. Empty state: No activity yet.
- Guide appears only for PUBLIC_DEMO or simulated payments. Its three numbered links open existing Settings role anchors and Transactions. The required recorded-answer/no-money line appears in simulated/replay mode. For the supported simulated/live-AI configuration, the line truthfully says live AI answers instead; the existing assistMode helper determines this. The person-decides caveat is always visible in the guide.
- Typecheck, 632 tests / 59 files (seven new tests), production build and whitespace checks passed. Production Playwright before/after: 390/1280/1920/2560px × Seller/Buyer/Reviewer × light/dark (24 views per stage). Existing desktop card content/geometry matches baseline exactly; all six mobile screenshot pairs match byte-for-byte. Verified newest-first five-row activity, 32px separation, 28px padding, stacking/equal columns, >=44px targets, visible keyboard focus and all links returning 200. Actual activity/Settings/Transactions clicks passed for every role; separate empty/non-demo view confirms the empty state and guide hiding. No overflow or console errors/warnings. Screenshots: `docs/ui/screens/home-activity-demo/`. QA used temporary databases only; Render data/configuration unchanged.


### 2026-10-31 — Desktop Fairness breathing room
- Started `ui/fairness-spacing` from origin/main `1e49c48` (PR #132 merged). Added three inert styling hooks on the Fairness page and a page-scoped desktop media query: shared spacing variables set major block gaps to 32px, card padding/inter-metric gaps to 28px, grid gaps to 24px, metric-part gaps to 8px and note-line/bullet gaps to 16px. The blue note text is capped at 75ch. Metric cards keep equal height with naturally top-aligned content, including Safety; shell width/margins are unchanged.
- Desktop only (>=1024px). No copy, numbers, labels, colours, icons, calculations, dependencies or other pages changed. Mobile styling is untouched.
- Typecheck, 625 tests / 57 files, production build and diff whitespace checks passed; no test changes needed. Production Playwright checked before/after at 390/1280/1920/2560px × Seller/Buyer/Reviewer × light/dark (24 views per stage). All six mobile image pairs match byte-for-byte; page text matches in all views. Verified 32px block gaps, 28px padding, 24px card gaps, 8px metric-part gaps and equal card heights. Expanded cases/notes/technical details remain readable, with no horizontal overflow or console errors/warnings. Screenshots: `docs/ui/screens/fairness-spacing/`. QA used a temporary database in simulated/replay mode; production data/configuration unchanged.


### 2026-10-31 — Fairness results consistency tidy
- Started `ui/fairness-tidy` from origin/main `894b4ae` (PR #131 merged). All six metric rows now put counts first, percentages second, with measured-value bar fills and uniform Lower/Higher is better cues. Best-value ticks remain neutral in recorded-answer mode; they do not imply a live-model pass. The error-gap note uses the same cue. Desktop panel headers reserve equal height so the first metrics align.
- Moved answer-key agreement into Steady answers; Safety contains only hidden tricks. All UI references use answer key. Differing cases have readable shipping/return titles, stored expected/actual outcomes in two short lines, and raw IDs/results in an inline Technical details section within the single case disclosure—no empty nested disclosure.
- The orange label-status note is three lines (10 checked, 40 accepted without checking individually, 12 drafts), retaining What this means. The blue scope note has four bullets, preserving builder-written key, no outside checking, made-up cases, limited sample, test coverage and mandatory human review for damage/missing parts. Bottom Technical details now has a matching bordered card. No evaluation results, helpers, API, business logic, dependencies or other pages changed.
- Typecheck, 625 tests / 57 files (four new presentation tests), production build and diff whitespace checks passed. Production Playwright: 18 views, 390/1280/2560px × Seller/Buyer/Reviewer × light/dark. Checked panel/first-metric alignment, grouping/cues, keyboard case expansion, two outcome lines, non-nested compact details, >=44px case targets, and no horizontal overflow or console errors/warnings. Screenshots: `docs/ui/screens/fairness-tidy/`. QA used simulated payments/replay AI with a temporary database; committed evaluation data and Render configuration are untouched.


### 2026-10-31 — Per-deal history timeline tidy
- Started `ui/deal-history-tidy` from origin/main `ec9923b` (PR #130 merged). The per-deal history now fills the shell for its header, verification banner and summary, with a centred 900px timeline and 16px mobile gutters. Newest-first order and all verification/checkpoint calculations are unchanged.
- One demo-record note replaces repeated row labels. Stored actors distinguish acceptance steps; provider-origin events (actor `paypal`, not marked simulated) retain a visible From PayPal label. The summary counts stored human roles, not people: role identifiers do not establish the number of individuals. Key milestones have calm blue icons/dots and a connecting line, without list/banner reveal animations.
- Each step has one keyboard-accessible disclosure. Opening it immediately shows compact sequence, actor, check result, fingerprints and event name; no nested disclosure or empty gap. The hint sits directly below the existing honest verification banner. Default AuditEvent presentation elsewhere remains available via an opt-in timeline variant.
- Passed typecheck, 621 tests / 56 files (4 new presentation tests), production build and diff whitespace check. Production Playwright checked 36 views: 390/1280/2560px × Seller/Buyer/Reviewer × light/dark × completed (10 steps) / disputed (9 steps). Verified actor labels, ordering, demo note, expanded values, keyboard opening, >=44px targets, 900px cap, 16px gutters and no overflow/console errors/warnings. Screenshots: `docs/ui/screens/deal-history-tidy/`. QA used an isolated /tmp database; no seed, event, verification or Render data/config changes.


### 2026-10-31 — Equal-width mobile status pills
- Started `ui/mobile-status-equal` from origin/main `c2ea8f1`. The existing equal StatusPill variant now uses one shared `--status-pill-width: 160px` variable at all widths. Default non-equal pills, labels, tones/colours and the dock are untouched; full labels remain in the existing title and screen-reader text.
- Home compact and Transactions mobile rows now show title/amount, category, own-line left-aligned status, created date, applicable next step, then deadline/Due soon. The responsive card markup in TransactionsBrowser follows the same order; desktop-only contents/date presentation preserves the existing table. No business logic, API, data, category-chip component or dependencies changed.
- Typecheck, 617 tests / 55 files and production build passed. Production Playwright: Home and Transactions, Seller/Buyer, 360/390/1280px, light/dark (24 views), no console errors/warnings or horizontal overflow. Every visible row pill is 160px; mobile status/category left edges and vertical order checked, all row targets >=44px, and the final row scrolls above the dock. All short Transactions labels, including Waiting for payment at 360px, fit without truncation. Longer existing full compact labels use the requested ellipsis with complete accessible text retained.
- Eight desktop comparisons matched baseline pill positions, dimensions, alignment, colours and text exactly. Screenshots (including desktop before/after and mobile bottom clearance): `docs/ui/screens/mobile-status-equal/`. QA used a separate /tmp database with demo data; Render seed/config was not changed.


### 2026-10-31 — Calm deadline cue ("Due soon")
- Branch `ui/deadline-cue` (Lead, owner-approved small change). `deadlineUrgency()` in view.ts: under 24h = soon, under 6h = urgent (amber / orange tokens, no red, no animation, no timer). Shown only when the current role must act. New `DueSoon` chip appears beside the time-left text on Home (desktop and mobile), Transactions (desktop and mobile) and the deal page; the Home "Your next step" card gets an amber border while the cue is active. The words "Due soon" carry the meaning; screen readers also get the time left.
- Verified: tsc, vitest 617 passed (4 new), build, Playwright 390/1280 Buyer/Seller light/dark with demo deals set to 20h and 4h left (local DB only; Render seed unchanged, so the cue appears there only when a deadline is under 24h).

### 2026-10-31 — Final polish 1: rules, history, Home and QA fixes
- Started `ui/final-polish-1` from origin/main `7c8f2c8` (PR #126). All the rules remains collapsible, with Shipping R1/R2/R3, Disputes R4/R5/R7 and PayPal R6 cards. RULE_COPY titles/text and all domain/rule/payment/audit logic are unchanged. Activity's Deal history link is now a 44px bordered button to the existing deal record. Settings/About history links still resolve to /audit; the missing mobile Settings Limitations link was added in its footer, without adding a menu row.
- Home success-history/footer links and duplicated demo lines removed; failure alerts retained. Desktop sidebar and mobile Home footer show exactly "Demo mode · No real money moves" once. Full deal PayPal-hold status now has a native keyboard/tap popover explaining that Creident pauses payment actions; a person decides using the rules, AI only summarises. Past-checkout Buyer visits redirect to the deal; Review desk Settings links are at least 44px.
- E1 observed root/limit: the local reviewer API returned HTTP 200 with correct data and gates. The repeat console errors reproduced were AG Studio's missing-licence banner; the chart import also lacked a bounded failure fallback. With no configured licence the page now visibly explains this and renders a read-only snapshot summary. Licensed charts retain their existing implementation, with import timeout/error recovery; API errors, malformed JSON and timeouts show a clear alert and working manual retry. No API/auth behaviour was changed. The owner's hosted HTTP failures could not be reproduced: outbound proxy denied CONNECT to Render (403), before any application response. A valid licensed-chart run remains owner verification.
- E2 root: a fresh shipping step reproduced the 224px centre-screen SuccessBurst ring. It was pointer-transparent and cleared after 2.2 seconds, not stuck. Deal pages now use an inline transient notice above the header instead; no ring overlays the action cards, and the notice expires without replay on refresh. Review/receipt animation defaults are unchanged.
- Verification: typecheck, 577 tests / 54 files (19 added for checkout routing and read-only reviewer API/gates), build passed. Production Playwright covered How it works (rules expanded), Home, a role-relevant deal and Review desk at 390/1280/2560, Seller/Buyer/Reviewer, light/dark: 72 combinations, no normal console errors/warnings or overflow. Final Reviewer views rechecked after UI adjustments. Additional checks passed for tooltip Escape/outside/tap/focus, history/limitations links, late-checkout redirect, empty data, API 503 then retry, malformed JSON and 10-second timeout, and timed success dismissal. Expected injected-failure responses were separate from the clean normal walkthrough. Screenshots: `docs/ui/screens/final-polish-1/`. No dependencies added.


### 2026-10-31 — P1: Equal-width desktop table status pills
- Started `ui/status-pill-width` from origin/main `b2760a9` (PR #124). Added an opt-in `equal` StatusPill variant only to desktop Transactions and Home tables. Desktop-only CSS centers dot + label at 160px; default/mobile styles, labels, tones and colours stay unchanged. Future long labels ellipsize visually while the full status remains in the title and screen-reader text.
- Measured all 15 short labels with loaded DM Sans 12px/700: longest was "Waiting for payment" at 120.002px, plus 6px dot, 6px gap and 20px padding = 152.002px; chose 160px for breathing room.
- Typecheck, 558 tests / 53 files and build passed. Seeded demo deals through Settings; Chromium Seller Home/Transactions at 390/1280/1920px, light/dark: all visible desktop pills exactly 160px, no current labels truncated, no console issues/overflow. Built-in seed shows 11 distinct labels; all 15 short labels were additionally checked in a temporary browser sizing probe, including future-label ellipsis. Mobile visible pills retain their individual content widths. Screenshots: `docs/ui/screens/status-pill-width/`. No data/API/logic or dependency changes.


### 2026-10-31 — B1: Desktop Buyer join hint
- Started `ui/buyer-hint` from origin/main `d25ebc1` after PR #123. Added the exact muted line "Open the link your seller shared to join a deal." below the desktop Buyer greeting only. Seller and Reviewer markup is unchanged; mobile was left unchanged to preserve its summary layout. No buttons, routes, dependencies or data/logic changes.
- Typecheck, 558 tests / 53 files and build passed. Production Chromium at 1280/1920px, light/dark, all three roles (12 views): hint shown only to Buyer, one line (20px) at both widths, four status tiles aligned, no overflow or console errors/warnings. Screenshot: `docs/ui/screens/buyer-hint/buyer-1280-light.png`.

### 2026-10-31 — J1: Buyer joins a deal by link or full ID
- Owner-approved feature-freeze exception. Started `feat/join-deal` from origin/main `d25ebc1`. Added Buyer-only Join a deal buttons to desktop greeting and mobile summary beside Transactions, with a native modal dialog and the requested labels/error. Seller/Reviewer presentation is unchanged. B1 is superseded: no hint sentence is added.
- `parseDealRef` accepts the lowercase UUID v4 generated by both createTransaction and demo seeds, HTTP(S) links from any domain, and origin/protocol-relative links. It rejects invalid IDs, reserved paths, whitespace, scripts, traversal/encoded paths and inputs over 2048 characters. Only the validated UUID is used to build a local checkout route. No API, schema, payment, state-machine, rule or dependency change. Short codes remain a post-hackathon idea; this uses the full existing deal ID.
- Typecheck, 594 tests / 54 files (36 new helper cases), and build passed. Production Chromium at 390/1280 light/dark: created a Seller deal through the form and copied its actual buyer link; Buyer joined by copied link, bare ID and other-domain link, all opening the local checkout. Invalid input/error, native modal tab order/background isolation, Escape/Cancel and returned focus checked; no overflow or console warnings/errors. Button absent for Seller/Reviewer. Screenshots: `docs/ui/screens/join-deal/`.


### 2026-10-31 — A2: Remove About card arrows
- Started `ui/about-remove-arrows` from origin/main `25e77db`. Removed the four desktop About arrows, their unused helper/CSS and reserved right padding. Icons, titles, descriptions, links, PayPal disclosure and focus rings remain; hover outlines the cards with the existing accent token. Mobile layout and copy are unchanged.
- Typecheck, 558 tests / 53 files and production build passed. Chromium at 390/1280/1920px, light/dark: no arrows, links and PayPal expansion worked, tab order/focus and hover verified, no console errors/warnings or overflow. Screenshot: `docs/ui/screens/about-tidy/a2-cards-no-arrows-1920-light.png`.


### 2026-10-31 — R1: Desktop sidebar role popup tidy
- Started `ui/role-switcher-tidy` from origin/main `e97b687` after PR #120. Sidebar popup follows its 207px trigger width, opens 8px above it, uses content height without an inner scrollbar, and shares its 20px radius/border. Three equal 64px rows have round icons, single-line descriptions and the existing selected check. Only the sidebar Reviewer description changes to "Decide disputes". Mobile presentation and role/cookie/routing/keyboard handlers are preserved.
- Typecheck, 558 tests / 53 files and build passed. Production Chromium at 1280/1920 light/dark: matching popup/trigger edges, 8px gap, no scrolling/overflow; all descriptions fit. Buyer/Seller/Reviewer switching, arrow wrapping, End, Escape and focus restoration checked at 390/1280/1920 in both themes, with URL query preserved and no console errors/warnings. Mobile geometry and copy match before; screenshot differences, when present, are limited to the animated trigger chevron. Screenshots: `docs/ui/screens/role-switcher-tidy/`.


### 2026-10-31 — W1: Full-width desktop info and Settings pages
- Started `ui/full-width-pages` from origin/main `5e255f2` (About PR #119 merged). Removed desktop inner width caps on How it works, About, Fairness and Settings, retaining the shell's 1560px cap. Headers and content now share both edges.
- How it works uses two numbered card columns on narrower desktops and three from 1600px. About uses four link-card columns on wide desktops; Settings keeps its aligned sticky 240px sidebar and uses two content columns on wide desktops. Existing copy, links, rules and mobile layout are unchanged; Home/Transactions source and shared shell/header were not edited.
- Typecheck, 558 tests / 53 files and build passed. Production Chromium: all five pages including Transactions, Seller, 390/1280/1920/2560px, light/dark (40 combinations), no console errors/warnings or overflow. Header/content rectangles match; desktop content widths 976/1504/1504px. All ten 390px before/after screenshots are pixel-identical. Six steps, seven rules and Settings anchors checked. Screenshots: `docs/ui/screens/full-width-pages/`.


### 2026-10-31 — A1: About desktop tidy
- Started `ui/about-tidy` from origin/main `55093ac` (Fairness PR #118 merged). Desktop About now centers the shared header and content at 1000px, with the Fairness-style 24px cards, a soft summary, four link/disclosure cards, collapsed history/testing sections and an amber limitations card. Existing copy, PayPal detail text, nine limitations and #decisions/#audit/#limitations remain available.
- Mobile uses its original presentation; 390px light/dark before/after screenshots are pixel-identical. No other pages, data, dependencies or logic changed.
- Typecheck, 558 tests / 53 files and production build passed. Browser at 390/1280/1920 in light/dark: links, disclosures and all three anchors worked, all nine limitations visible when opened, no overflow. Initial dev asset 404s during concurrent build were absent when repeating the complete walkthrough against the production build (no console errors/warnings). Screenshots: `docs/ui/screens/about-tidy/`.


### 2026-10-31 — F1: Fairness dashboard
- Continued the existing unverified `ui/fairness-dashboard` draft (ea045b7), then merged current origin/main for compatibility. Changed only fairness presentation and page-scoped CSS.
- Added a scoped summary, neutral navy donut (25 / 35 / 2 of 62 made-up cases), three metric panels, visible differing-case list and collapsed technical details. Recorded-answer caveat and label review status remain explicit; no evaluation data or helpers changed.
- Verification: typecheck, 558 tests across 53 files, and production build passed. Chromium at 390, 1280 and 1920 px in light/dark: no horizontal overflow or browser errors/warnings. Screenshots: `docs/ui/screens/fairness-dashboard/`. No live-model run was performed; the committed results are replay data.


### 2026-10-31 — S1 desktop Settings tidy

- Started `ui/settings-desktop-tidy` from `origin/main` at `cd98152`. Desktop `/menu` now has a centered 1080px layout, aligned 240px sticky sidebar, consistent cards, three role option cards, a compact demo-data action, and a two-column Learn grid with only Deal history and Limitations for Seller. Reviewer also keeps the Review desk link. Two live links fill one balanced row; no filler or duplicate sidebar links were added. Mobile Settings is pixel-identical before and after in light and dark.
- Typecheck, 558 tests in 53 files, and build passed. Browser checks at 1280/1920 light/dark confirmed alignment, sticky sidebar, role switching, anchors, no console issues or overflow. Screenshots: `docs/ui/screens/settings-desktop-tidy/`. No data, API, rules, payments, dependencies, or mobile behavior changed.

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


### 2026-10-31 — UI audit fixes and calm polish (ui/audit-polish)

- Completed the three requested UI phases. Started at `da61f89` with owner approval; merged documentation-only main `032aeac` via `26909b8` after #136 landed. README and prior HANDOFF entries were preserved; this entry is appended as requested.
- Phase 1 (`9e91d76`): neutral review-desk snapshot wording, readable recommendation label, display-only deadline names, Settings shortcut-list removal. Share-card visibility was already correct in #137; regression tests cover seller/status gates and created=1 without changing behavior.
- Phase 2 (`010773c`): header Demo pills, full-width checkout, item title once, one review Technical details with original/translation hashes, compact Fairness notice and mobile deal rows with visible demo labels.
- Phase 3: Transactions pins actions by nearest deadline, then groups other rows by latest recorded step into Today / This week / Earlier (UTC, Monday week). Home stays ungrouped: actions, active, closed/cancelled; newest within each. Existing filters apply first; no duplicates or new Drafts behavior.
- Added status icons/full accessible labels, neutral CSS-animated Home counts, role-specific round shortcuts, responsive deal hero/progress/action aside, four required condition radio chips, USD prefix and required markers. Hero/sticky links target the single existing action form; the mobile dock and action requests are unchanged. Reduced motion is respected.
- Verification: typecheck passed; 662 tests / 66 files passed; production build passed. Playwright: 180 page/role/width/theme views (390/1280/2560, Buyer/Seller/Reviewer, light/dark), no console warnings/errors or horizontal overflow in the completed run. Filter/query state, duplicate prevention, 160px desktop pills, one action UI, dock spacing, Join dialog, replay draft, real condition/category creation, real evidence translation and reduced motion checked.
- Evidence and before/after table: `docs/ui/screens/audit-polish/REPORT.md`. Baselines cover representative light views at 390/1280; after screenshots cover the full matrix. Testing used an isolated local database with simulated PayPal/replay AI, not the Render seed or real payments. No domain/API/schema/rules/payment/AI/deadline/hash code or dependency changed; no deployment.
- Three phase commits plus the owner-requested main merge. Push/PR outcome is recorded in the final task report; the owner merges. No additional owner decision required. Short join codes remain outside this task.


### 2026-10-31 — Second-audit small UI fixes (ui/audit-fixes-2)

- Based on main `ec59724` after #138. One commit per requested item: `92d5b5e` mobile primary-control placement; `7571766` mobile filters/subtitles; `165c880` desktop progress; final optional form polish with verification evidence.
- The actual existing primary button/link is sticky on mobile, so there is no third copy inside the next-step card. Form inputs, supporting dispute controls, confirmation and API calls stay intact. Desktop keeps its card action. Waiting roles have no hero-only history shortcut. Existing bottom padding lets the last card scroll clear of the dock/sticky button.
- Mobile filters scroll on one line and reveal the active chip on load/selection without moving the page. Mobile row titles cap at two lines; category/date subtitles stay on one line, omit the year and per-row Demo (the header badge remains, per owner instruction). Home shares this renderer. Pinned/date grouping is unchanged.
- Desktop progress shows short node titles and one full-width current description; other details remain in tooltip/accessibility labels. Full approval wording and mobile vertical descriptions are retained. Optional New deal required hint and separate USD prefix box are included; form values/validation are unchanged.
- Checks: typecheck/build passed; **676 tests / 67 files passed**. Playwright: 56 final views at390/1280, light/dark, all role/action/wait states plus list/form role gates; no console warnings/errors or overflow. Checked all initial filter selections, 44px main targets, bottom clearance, real new-deal creation/simulated approval/sticky shipment once, confirmation Cancel without a payment request, and evidence navigation.
- Before/after evidence and limitations: `docs/ui/screens/audit-fixes-2/REPORT.md`. Isolated local test database only; no source data, domain/API/rules/hash/payment behavior or dependency changed. No deployment. No extra owner decision needed; the owner merges the PR.

### 2026-10-31 — Edit a deal while it is a Draft + seller-only Drafts filter (feat/edit-draft)
- Codex built it (commits 278c27e, 1e344bf) and ran out of credit before the PR/HANDOFF; Claude (Lead) reviewed, verified and opened the PR.
- Editing is allowed only while status is DRAFT and the buyer has not accepted. Server refuses otherwise (409, "Terms are locked because the buyer accepted"); the edit is atomic and appends one `TERMS_EDITED` event (field names only, hash chain still verifies), resets the seller's acceptance, and keeps the same deal id/link. A revision hash blocks stale forms and stale accepts. No new status, no state-machine or rules change, no delete route (a test checks this).
- UI: "Edit deal" on Draft rows (desktop and mobile) and on the deal detail, using the existing deal form; seller-only "Drafts (n)" filter chip, hidden for other roles. History label: "Seller edited the terms".
- Checks: typecheck and build passed; 710 tests / 69 files passed. Browser check (isolated local DB): chip shows, edit prefilled and saved, history shows the edit event, buyer accept then edit returns 409 and Edit disappears, no console errors.
- Pending after merge: owner re-checks on Render; no extra decision needed.

### 2026-10-31 — Remove duplicate "Deal history" button on deal detail (ui/fix-focus-dup)
- Deal detail had two "Deal history" buttons (Activity header + a card at the bottom); the bottom card is removed. Desktop now shows one link, mobile two (round action in the hero when an action exists, plus Activity), by design.
- The closed "Draft from a listing with AI" panel was checked for keyboard access: closed `<details>` content is not tabbable (focus goes from the summary to the Item name field), so nothing needed fixing there.
- Checks: typecheck and build passed; 710 tests / 69 files passed. Link count verified over all seeded deals for seller, buyer and reviewer; no console errors. Presentation only; no behavior, data or dependency change.

### 2026-10-31 — Buyer mobile dock gets Join a deal and How (ui/buyer-dock)
- Buyer's mobile bottom bar had only Home, Transactions, Settings. It now mirrors the seller's five columns: Home, Deals, **Join** (centre button, opens the existing Join a deal dialog), How, Settings. Seller and reviewer docks are unchanged (reviewer keeps three items).
- `JoinDeal` got an optional `label` prop (dock shows "Join"; accessible name stays "Join a deal"). No change to link parsing or routing.
- Checks: typecheck and build passed; 710 tests / 69 files passed. Browser check at 390 px (touch): buyer dock shows the five items, centre button opens the dialog, invalid text shows the error, a valid deal link goes to its checkout, How highlights on /how-it-works; seller and reviewer docks unchanged; no console errors.

### 2026-10-31 — Desktop sidebar main action + reviewer mobile dock (ui/desktop-cta)
- Desktop: a full-width action button sits under the logo on every page: **New deal** for the seller, **Join a deal** for the buyer (opens the existing dialog), none for the reviewer. Previously these existed only on Home.
- Mobile reviewer dock now has five columns like the other roles: Home, Deals, **Desk** (Review desk, `/reviewer/oversight`), How, Settings. The centre item is plain (no raised button).
- Checks: typecheck and build passed; 710 tests / 69 files passed. Browser check: sidebar button shows on Home, Transactions, Settings and Fairness for seller and buyer; seller button opens New deal; buyer button opens the dialog and a valid link goes to checkout; reviewer has no button; reviewer dock items and Desk/How navigation and current state work; no console errors. Presentation only.

## 2026-10-31 — Reviewer sidebar: Review desk link (desktop)
- Added a "Review desk" item (shield icon, same as the mobile dock) to the desktop sidebar for the reviewer role only. Active state on `/reviewer/oversight`.
- Checked: tsc, 710 vitest tests, build, Playwright (reviewer sees the link and it opens the desk with the item highlighted; seller and buyer sidebars unchanged; 0 console errors).
- Pending: none. UI stays frozen otherwise.

## 2026-10-31 — README screenshots refreshed
- Re-captured the 11 images linked in the README "Screens" table (home-buyer, home-dark, deals, new-phone, deal-completed, evidence-damaged, dispute-review, review-dark, decision-receipt, audit-detail, fairness) from the frozen UI (main at e59c05a): fresh public-demo database, simulated PayPal, recorded AI. Same filenames, so README links are unchanged. 0 console errors during capture.
- Not refreshed: the four `oversight-*` images in the appendix. They were taken without an AG Studio licence key (trial watermark), and the README already says so. Replace them with captures of the licensed live Review desk if wanted.

## 2026-10-31 — README: "Menu" renamed to "Settings"
- The app's menu page is now called Settings (sidebar and dock); README still said "Menu" in 7 places. Updated the wording; Review desk now described as reachable from the sidebar or bottom bar. Docs only.
