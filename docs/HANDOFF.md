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
