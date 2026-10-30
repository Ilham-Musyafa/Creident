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

### 2026-10-30 — BK1b C/check spacing and d refinement

- Continued ui/creident-mockup from aefa16e. Trimmed C lower terminal and used an
  exclusion mask to separate the rounded check. Check stroke 108 units (83% of
  reference 130-unit letter stroke); wordmark option B gap 52 units (40%).
  A/B/C spacing studies and light/dark 48/24px comparisons in docs/brand/fix/.
- d hook now bends visibly inward and meets its bowl; remaining glyphs unchanged.
  Preserved BK1 baseline SVG and before/after screenshot for owner review.
- At 16px, 40% vector gap visually closed through antialiasing; standalone mark
  uses 85-unit optical floor. Raster inspection confirms a background gap between
  C/check, also in mono vector geometry. This exception is documented in BRAND.md.
- Regenerated all v2 SVG/PNG/favicon/app/maskable/OG exports and board screenshot.
  Node 22.23.4: 522 tests/50 files, typecheck/build pass. Only docs/brand,
  public/brand/v2 and handoff changed. No dependencies or app wiring/deployment.
- Push target origin/ui/creident-mockup; no PR claimed. Manual compare:
  https://github.com/Ilham-Musyafa/Creident/compare/main...ui/creident-mockup

### 2026-10-30 — BK1 Check-C brand kit (no app wiring)

- Continued ui/creident-mockup from clean 600c55b. Rebuilt attached visual direction
  with outlined Outfit 700, attached Sapphire C-check and inward curled d stem with
  rounded lower-right notch. Standard remaining glyphs. No attached JPG committed.
- Added public/brand/v2 exports: wordmarks (light/dark/mono), marks, three rounded
  app icons, SVG/16/32 favicons, 180 Apple icon, 192/512 icons, full-bleed maskable
  export, 1200x630 OG image. SVG rebuild script and OG source under docs/brand.
  Existing source, logo files and favicon wiring untouched. No dependencies.
- Dark check is Sky (8.88:1 on Navy vs Sapphire 4.35:1); Sapphire app tile uses
  white mono mark. BRAND.md covers versions, clear space, minima, WCAG ratios,
  typography and misuse. Board shows all requested assets, fonts and size examples.
- Preinstalled /usr/bin/python3 FontTools/Brotli outlines original local WOFF2;
  no SVG text font dependency. Chromium canvas produces PNG sizes; DM Sans OG
  uses local font. 37 board images loaded with no overflow. Managed browser blocks
  file://; used temporary localhost static server, no external font/image service.
- Node 22.23.4: 522 tests/50 files, typecheck/build/diff check pass. Changes limited
  to docs/brand, public/brand/v2 and this handoff. No BK2 wiring, merge or deployment.
- Push target origin/ui/creident-mockup. No PR claimed. Manual compare:
  https://github.com/Ilham-Musyafa/Creident/compare/main...ui/creident-mockup

### 2026-10-30 — L3 Check-C wordmark study

- Continued ui/creident-mockup from clean c363d67. check-c.png reference absent;
  followed the written direction and explicitly documented that limitation.
- Created twelve wordmark variants, twelve dark versions and standalone marks
  with dark versions (48 SVGs total), static gallery, 1440px preview and comparison
  table in round-3-check-c only. All Outfit glyphs outlined with preinstalled
  system FontTools (500/600/700); no dependencies or SVG font loading required.
  Custom check terminals, echo dot and tracking changes are presentation artwork.
- Recommendations: 12 Gentle rise, 01 Baseline, 04 Rounded check. 07 lowercase is
  the explicitly requested exception to initial capitalization, not misspelling.
  Tiny echo dot is intentionally subtle; no final selection or app integration.
- Browser: 12 cards, 180 images loaded, no external requests or overflow; inspected
  light/dark and small sizes. file:// blocked by managed Chromium policy, so preview
  uses temporary localhost static server; relative-only HTML has no build/CDN.
  Node 22.23.4: 522 tests/50 files, typecheck, build and diff check pass.
  Source/public/app untouched; only round-3-check-c and this handoff changed.
- Push target origin/ui/creident-mockup only. No PR created or deployment.
  Manual compare: https://github.com/Ilham-Musyafa/Creident/compare/main...ui/creident-mockup

### 2026-10-30 — L2 rounded logo exploration

- Continued ui/creident-mockup from clean aaf6dc4. Owner rejected round 1;
  reviewed its gallery and made six soft curved concepts in round-2 only.
  Mood sheets were absent. Eighteen SVGs (symbol/dark/app icon), static local
  Outfit gallery, 1440px full-page preview and strengths/24px weaknesses table.
- Top directions: 01 Hug check (friendly embracing gesture), 03 Dot C (small-size
  clarity). No logo selected or installed; source/public assets unchanged.
- Browser via temporary localhost static server: six cards, sixty images loaded,
  local Outfit loaded, no external requests or horizontal overflow. Visually
  inspected both themes and 24px comparison. Managed Chromium blocks file://;
  direct-file rendering cannot be verified here, but HTML uses relative assets
  and no scripts/CDN/build step. Node 22.23.4: 522 tests/50 files, typecheck,
  build and diff check pass. Only round-2 docs and this handoff changed.
- Push targets origin/ui/creident-mockup only. No PR created or deployment.
  Manual compare: https://github.com/Ilham-Musyafa/Creident/compare/main...ui/creident-mockup

### 2026-10-30 — L1 ten logo concepts (docs only)

- Continued ui/creident-mockup from clean edb862b. Reviewed current brand assets,
  BrandLogo and historical exploration 055d7f6 via git show. Created ten distinct
  vector concepts, twenty light/dark SVGs, static Outfit gallery, 1440px full-page
  preview and strengths/24px weaknesses table in docs/ui/logo-concepts/.
- Recommendations: 10 Aligned corners, 06 Ledger stack, 03 Common ground. No option
  selected or installed; all app assets/source unchanged. No dependencies.
- Browser: ten cards, eighty loaded image previews, local Outfit loaded, no external
  requests or horizontal overflow. Visually inspected 24/48/96px in both themes.
  Managed Chromium blocks file:// by policy; used temporary localhost static server
  for screenshot. HTML uses relative local assets and no scripts/build, but direct
  file rendering cannot be verified here. Node 22.23.4: 522 tests/50 files,
  typecheck and build pass. Only concept docs and this handoff changed.
- No deployment. Manual compare: https://github.com/Ilham-Musyafa/Creident/compare/main...ui/creident-mockup
  No PR claimed; owner chooses the next direction.

### 2026-10-27 — F1 Outfit wordmark

- Continued ui/creident-mockup from clean HEAD 10a7aea. Registered self-hosted
  Outfit variable latin WOFF2 (32,292 bytes), OFL license, display swap and sans
  fallback. Brand token now uses weight 600 / tracking -0.015em at existing sizes.
  Shared brand-wordmark covers BrandLogo, mobile header and desktop sidebar.
- Body/headings, tagline, symbol assets, accessible brand text and behavior unchanged.
  Source search found no remaining Georgia/serif brand usage. Other sans-serif
  fallbacks (including StudioDashboard) left unchanged. Historical design docs
  describing the old serif are not new runtime styles.
- Node 22.23.4: 522 tests/50 files, typecheck and build pass. Browser: 390/1440,
  light/dark, computed brand font 600 and no horizontal overflow. Eight before/after
  images: docs/ui/screens/wordmark-outfit/. No dependency or remote runtime font.
- Implementation 06c2281 pushed to origin/ui/creident-mockup. GitHub GraphQL
  returned Forbidden on PR creation; no PR created. Manual compare:
  https://github.com/Ilham-Musyafa/Creident/compare/main...ui/creident-mockup
  Not deployed or merged.

### 2026-10-26 — Plain English copy and truthful payment labels

- Continued unmerged ui/creident-mockup from 527d3e7 (newer than the requested
  a53d51a), as authorized. No dependency, domain/API/data/rule/payment changes.
- Replaced seller-payment wording with Charge the buyer (capture), leaving RELEASE
  and every action payload unchanged. Receipt now reuses the existing deal-summary
  success-state renderer; no decision choice is treated as proof of charge/refund.
  Deal confirmation distinguishes actual capture from approval. Removed unrecorded
  USD/fee assertion from the receipt; fee policy uses the approved glossary.
- Shared presentation helpers: presentationCopy (greeting, action/evidence labels),
  ruleCopy + RuleLabel (About titles first, secondary code), decisionCopy (extracted
  existing formatter), TechnicalDetails (closed native disclosure, 44px summary).
  Errors show plain copy first, keeping original codes/debug IDs inside details.
  IDs/hashes/fingerprints/event names/provenance stay available there. Plain record
  check results and warnings remain visible. User-authored evidence/reasons and
  original metadata are not rewritten. Review/receipt use Buyer/Seller evidence N.
- Home/Transactions/create/Settings/Records use one glossary, including Hi, Demo
  Buyer/Seller/Reviewer and New deal / Create deal. New-deal and Settings mode labels
  use the existing simulated flag. Plain-language About/Records/Fairness guidance
  preserves operator trust, external-copy, test-scope and integration limitations.
- Node 22.23.4: 522 tests/50 files, typecheck, build and diff check pass. Browser
  matrix: 180 views at 390/1440, both themes, all three roles. No raw-data default
  exposure, horizontal overflow or page errors. Keyboard disclosures pass. Buyer
  receipt confirmation cancelled safely; Reviewer action still posts RELEASE and
  shows Payment charged only after successful capture in disposable simulation.
  Five full-page 390px screenshots saved; evidence screenshot uses populated data.
  No live provider call. Existing money-state tests are preserved.
- Verification and publication status are recorded in ui/screens/copy-pass/README.md.
  Full before/after table: copy-changes.md in that directory. docs/UI.md contains
  the glossary and disclosure policy. No merge or deployment authorized.
- Implementation 6ca3dfd pushed to origin/ui/creident-mockup. PR creation attempted;
  GitHub GraphQL returned Forbidden. No PR created by this agent. Manual link:
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  PR body: /tmp/creident-copy-pr.md. No merge or deployment.

### 2026-10-26 — About logo removal and info-page bottom clearance

- Continued ui/creident-mockup from a53d51a. Removed only the duplicate About
  BrandLogo card/import; title, intro, copy, anchors, header/sidebar brand,
  brand assets and 24px card scale remain unchanged.
- Mobile-only .info-panel bottom padding now explicitly adds device safe area to
  its 20px inset. AppShell already reserves 128px below content, shared with
  Home/Records; that reservation is retained. No desktop padding change.
- Node 22.23.4 gates: 517 tests/49 files, typecheck, build and diff check pass.
  Browser: 18 scenarios at 360/390/1440, both themes, all roles. Last About card/
  Fairness notice clear the dock by >=63px; expanded final limitations bullet
  by >=85px. All 24 mobile Settings anchor navigations pass, no overflow/errors.
  Header/sidebar wordmarks remain; no About content logo. Four 1440px Fairness
  top/bottom light/dark Seller pairs are pixel-identical; About desktop shifts up
  solely because its logo card was removed. No src/lib/API/rule/data/copy changes.
- Screenshots/evidence: docs/ui/screens/info-pages-mobile/followup/ (11 images).
  Scripts /tmp/creident-info-bottom-*; final local production server 3232.
  Headless safe-area value is 0; actual inset is included by the CSS env formula.
  No new dependencies or tests needed for these reversible layout changes.
- Implementation c39452c pushed to origin/ui/creident-mockup. PR creation attempted;
  GitHub GraphQL returned Forbidden. No PR created by this agent. Manual link:
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  PR text /tmp/creident-info-bottom-pr.md. No merge or deployment.

### 2026-10-26 — Deal story follow-up: payment truthfulness and first paint

- Continued ui/creident-mockup from e478337 as requested, no main push.
- DealDecisionSummary now distinguishes reviewer choice from successful stored
  payment state: captured flag, REFUNDED/VOIDED or frozenFrom, and completed
  partial metadata/PARTIALLY_REFUNDED. Pending/failed effects use neutral labels;
  a requested event effect alone is not evidence of success. All amounts use
  tx.currency, including stored partial fallback. Removed unrecorded fee claim.
  Recommendation/reason/link unchanged; never says seller payout occurred.
- Seller share card moved immediately after #next-step in the main column for
  created=1 OR DRAFT. Prior pre-b5 condition was created only; DRAFT fallback is
  requested here. Copy does not falsely assume Seller acceptance. Actual copy
  button and feedback tested, one card, no share card for other roles.
- Restored unconditional PayPalDisputePanel invocation. Confirmed b5dc67a's parent
  already had internal !captured && no cases -> null; that original visibility
  rule and markers remain. The removed page guard was equivalent/redundant.
- DealDisclosure no longer has client effects/matchMedia/open state. CSS selects
  static expanded desktop sections or closed native mobile details from the same
  read-only children. No repeated IDs/interactive children; only one variant
  visible/accessibility-exposed. 24px/16px scale retained. Empty PayPal wrapper hidden.
- Gates Node 22.23.4: npm test 517/49 files, typecheck, build, diff check pass.
  Eleven added financial wording tests: success/failure/pending, requested-effect
  non-proof, frozen terminal/partial fallback, currency (EUR renderer-only; API
  remains USD-only), and split wording. No src/lib/API/payment/rule/audit changes.
- Browser: 48 application views at 390/1440, light/dark, all three roles, plus 12
  isolated actual SSR-markup/CSS no-JS checks. Correct share adjacency/copy URL,
  desktop expanded/mobile initially closed, native keyboard, panel visibility,
  no overflow/runtime errors. Sixteen actual screenshots in
  docs/ui/screens/deal-detail-story/followup/; exact wording table/limits in README.
- No-JS scope caveat: full app React streaming keeps content under hidden S:0 until
  bootstrap JS reveals it. AppShell/streaming untouched in this task. The 12 no-JS
  checks isolate returned server deal markup with real stylesheets to prove the
  disclosure itself needs no JS; do not claim full-app no-JS support.
- QA /tmp/creident-story-followup.sqlite copied from synthetic story fixture;
  new screenshot deals use normal simulated APIs, existing actual refund/PayPal
  case records reused. No payment-state edits for captures; original fixture and
  seed unchanged. Scripts /tmp/creident-followup-*; final server local port 3231.
- UI.md updated. Implementation `a97b43f` pushed to origin/ui/creident-mockup.
  PR creation attempted; GitHub GraphQL returned Forbidden. No PR created by this
  agent. Manual link: https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  PR text /tmp/creident-deal-followup-pr.md. No merge or deployment.

### 2026-10-26 — Deal detail story and one next-step card

- Confirmed origin/main still 9a1acd1; ui/creident-mockup unmerged. Continued from
  70f2f67, no main push. Item is the page heading; ID secondary. Main order now
  summary -> actual next-step UI -> recorded Decision -> Progress -> Activity.
  Removed duplicate banner/CTA; keep #next-step, role/acceptance suppression and
  every original action component/API/error/confirmation. Waiting text names the
  party using existing presentation helpers. Pending refund/capture notices retained.
- Decision summary reads existing human decisions/recommendations/events, uses
  receipt outcome/agreement semantics and real amounts/reason/link. Pending return/
  split decisions also remain visible; no invented outcome, payout or confidence.
  Activity gets an empty state; Timeline optionally marks Current step as text.
- Terms/fees/PayPal/courier/share/record info moves to secondary column/last on
  mobile. DealDisclosure has one native copy, closed mobile/open desktop.
  DealSecondary sticks only when its measured height fits. All detail cards use
  24px/16px scale via scoped CSS/data-ui hooks. No other route restyling.
- No src/lib, API, status/nextAction/timelineFor, payment, deadline, audit/evidence
  hashing or dependency changes. No new confirmation dialog or AI replay marker.
- Gates on Node 22.23.4: 506 tests/49 files (nine new focused presentation safety
  tests), typecheck and production build pass. Browser: four UI walks at 390/1440,
  light/dark through acceptance, demo approval, shipping, inspection, dispute,
  both parties' evidence, review and decided receipt. Return, release, partial
  refund and refund-without-return covered. No runtime exceptions.
- 184 status/role/theme/width views: all 15 statuses, one next-step branch and no
  duplicate main CTA, waiting roles no next-step button, expected disclosures,
  no overflow/errors. Typical next-step top <=431px. REFUNDED/empty-feed use
  explicitly synthetic view fixtures, not financial-flow claims. Extra UI checks
  cover confirm receipt and demo PayPal inquiry/escalation/PDF/Reviewer sync.
  1,172 body/chip/contrast probes pass. Disclosure keyboard/resize tested.
- Screenshots, walkthroughs, matrix, tests and full role-action table documented
  in docs/ui/screens/deal-detail-story/. UI.md updated. QA DB /tmp/creident-story.sqlite
  is isolated; original fixture/seed unchanged. Scripts /tmp/creident-story-*;
  production browser server 3229. No owner decision, merge or deployment.
- Implementation `b5dc67a` pushed to origin/ui/creident-mockup. PR creation attempted;
  GitHub GraphQL returned Forbidden. No PR created by this agent. Manual link:
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  PR text: /tmp/creident-deal-story-pr.md. No merge or deployment.

### 2026-10-26 — Mobile info pages and explicit full-bleed opt-in

- Fetched origin/main (`9a1acd1`); ui/creident-mockup remains unmerged. Continued
  that branch from `3d98b87` as requested. Planning branch remains separate.
- Root cause: AppShell inferred zero mobile padding from Home/Menu active state.
  Now only mobileFullBleed selects zero padding. Home and Settings explicitly opt
  in, preserving their existing header/panel geometry. Transactions and Records
  already opted in; all other default pages retain px-5 pt-6.
- All implicit-rule routes: /, /menu, /about (#decisions/#limitations), /fairness,
  /reviewer/oversight. No other Menu-active pages. Oversight and its role/code
  notices regain the ordinary 20px inset; Studio/access logic is unchanged.
- New InfoPageShell composes compact MobileBrandHeader, existing role dropdown,
  MobilePanel and original PageHeader/back /menu for About/Fairness. Mobile-only
  CSS scopes 24px card/rule/notice/logo radius, 16px content insets, 18px headings,
  28px fairness values, wrapping, 44px/focus-visible summaries and anchor margin.
  Native rule accordions, chevrons, chips and all copy/data remain intact. Notice
  gains an optional className hook; its defaults on other pages are unchanged.
- Node 22.23.4: 497 tests/48 files, typecheck, production build and diff check pass.
  Browser: 60 before + 60 after views at 360/390/1440, Buyer/Reviewer, both themes;
  no after overflow/page exceptions. Eight interactive scenarios check Settings
  anchor links/back, 56 keyboard rule toggles, focus/44px targets, card geometry
  and unchanged visible copy. Seller/locked-Reviewer smoke, 642 all-role/theme
  text/contrast probes and 12 other-page regression checks pass.
- All 16 Home/Settings mobile raster pairs and all 12 desktop About/Fairness/
  oversight pairs are identical. Desktop Home's four pairs also identical.
  Desktop Settings has three tiny border raster exceptions (23/2/5 pixels,
  max 1 RGB level); retained transparently, no geometry/text change.
- Evidence/screenshots: docs/ui/screens/info-pages-mobile/; UI.md updated.
  QA scripts /tmp/creident-info-*.mjs, extra raw screenshots under
  /tmp/creident-info-extra-screens; local after production server 3228. No new
  dependencies, lib/API/eval/payment/rule/state/audit changes. No owner decision.
- Implementation `cee06c0` pushed to origin/ui/creident-mockup. PR creation attempted;
  GitHub GraphQL returned Forbidden. No PR created by this agent. Manual link:
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  PR text: /tmp/creident-info-pages-pr.md. No merge or deployment.

### 2026-10-26 — Mobile Home Demo markers and role-relevant rows

- Continued unmerged `ui/creident-mockup` from `0d05032` as requested.
- MobileTransactionRow compact mode now shows a visible 12px Demo badge beside
  the status, with wrapping metadata; all compact consumers inherit it.
- Home mobile selection uses the existing seed/create demo party IDs (`buyerId`
  buyer / `sellerId` seller). Reviewer gets only the actual UNDER_REVIEW queue.
  Existing transactionRow action logic (including accepted DRAFT terms) determines
  needs-action priority, then active; stable sorting retains repository updated /
  created recency within each priority. Maximum three rows, See all still /deals.
  This is demo role relevance, not user authentication or production ownership.
- Desktop receives its original recent data. Main-action selection is untouched.
  No lib/domain, API, payment, rule, audit, dependency or data changes.
- Node 22.23.4: npm test 497/497 (48 files), typecheck and build passed.
  Production Chromium: 390px light/dark for all three roles, visible Demo markers,
  expected fixture selection, correct unchanged main actions, no overflow/runtime
  exceptions. Buyer/Seller show 3 rows; Reviewer has 1 actual queue record.
  1440px Home before/after is pixel-identical in all six role/theme combinations.
- Updated captures and home-fixes-*.json evidence under docs/ui/screens/creident-home/;
  README distinguishes current screenshots from historical comparison evidence.
  Updated UI.md to require the per-row visible marker and describe selection.
- Implementation `4f237d5` pushed to origin/ui/creident-mockup. PR creation attempted;
  GitHub GraphQL returned Forbidden. No PR created by this agent. Manual link:
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  No merge/deployment or pending owner decision. Baseline captures
  /tmp/creident-home-fixes-before; QA scripts
  /tmp/creident-home-fixes-check.mjs and /tmp/creident-home-fixes-selection.py;
  local simulated server 3227, synthetic fixed-clock fixture only.

### 2026-10-26 — Persistent desktop sidebar shell

- Confirmed previous mobile Home task finished at 94b24d9. ui/creident-mockup remains
  unmerged, so continued that branch from **94b24d9**, as requested. No main push,
  merge or deployment. Desktop reference ZIP PNGs archived under
  docs/ui/reference/creident-mockup/desktop/; example data never copied into code.
- DesktopNavigation replaces its sole hamburger/drawer consumer with fixed 248px
  navy sidebar, four primary links, existing Learn routes/anchors, server-cookie
  demo role card and simulated/Sandbox notice. Route/hash current states, keyboard
  focus, skip-to-content, above-card role popover and existing theme control work.
- AppShell now reads the existing request role/mode. Presentation-only layout helpers
  moved unchanged to layoutPrimitives.tsx; nine client import paths updated to keep
  server cookie APIs out of browser bundles. Body JSX retained. Existing synchronous
  receipt tests mock only AppShell, preserving all financial/receipt assertions.
- TransactionsBrowser portals its original controlled search to the top bar on /deals
  only; filters/URL/history preserved. No global search or invented optional count
  badge. Existing NavIcon reused. Desktop tokens/container (1200px) and .desktop-grid
  (12 columns) added. Mobile wrapper has display:contents; print offsets removed.
- Gates: 497 tests/48 files, typecheck, build and diff check passed on Node 22.23.4.
  Browser: 408 views (17 routes x 4 widths x 3 roles x 2 themes), no runtime exceptions
  or overflow; 18 interactive desktop scenarios, 126 shell text/contrast checks pass.
  Existing reviewer gate rejects missing code. Expected invalid callback API 400s
  are documented; no valid payment callback/money flow was invoked.
- Mobile comparison: 102 pairs vs 94b24d9 with fixed QA-only clock. Stable views
  including Home/Transactions/Records/Settings match exactly. Oversight widgets are
  allowed to finish at expanded height. 100/102 raw pairs are pixel-identical; About
  buyer-dark has 182 border pixels and callback seller-light 58 border pixels differing
  by <=2 RGB levels, no text/layout change. Raw exceptions retained in evidence.
- Screenshots/evidence: docs/ui/screens/creident-desktop-shell/. Updated UI.md.
  Baselines/scripts/DB remain /tmp/creident-shell-*; final local app port 3226,
  isolated baseline source at /tmp/creident-shell-baseline-src (94b24d9), port 3224.
  No provider credentials, new dependencies or API/domain/payment changes.
- Implementation commit `03a76c9` pushed to origin/ui/creident-mockup. PR creation
  attempted once for this iteration; GitHub GraphQL API returned Forbidden. No PR
  was created by this agent. Manual link:
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  PR text: /tmp/creident-desktop-shell-pr.md. Follow-up docs commit records status.
  No owner decision pending. No merge or deployment.

### 2026-10-26 — Mobile Creident Home and shared primitives

- Took requested branch path: ui/nexobank-home (e07eb9d) is merged; created
  `ui/creident-mockup` from latest origin/main `9a1acd1`. Separate unmerged security
  audit branch is not stacked here. No main push, merge or deployment.
- Original reference PNGs were absent. Owner first supplied generic finance JPEGs,
  then the actual approved Creident concept sheet (Home light/dark) and inner-page
  close-ups. Archived originals and Home crops with provenance under
  docs/ui/reference/creident-mockup/. Concept example data never enters the app.
- MobileBrandHeader has compact/hero variants, Demo badge and original gradient/wave/
  brand/role control; MobilePanel extracts four duplicate wrappers. Tokens contain
  new mobile values. StatusPill inherits semantic mobile tones; bottom dock active
  icon+label uses Sapphire with AA dark text. Desktop styling remains intact.
- Home: real approved amount/eye in header, two working role/Browse pills, four tiles,
  inline first sorted role task with existing route/deadline and right-hand button,
  up to three real rows, verification footer/warning, empty/seed and mode limits.
  Reviewer has one actual queue row. No fake dates where current row data lacks one.
- Reused MobileTransactionRow with compact layout, square icons, heading-font money,
  actual status text and short deadline/full title. Compact approval says Approved ·
  not charged; full label remains in title. Demo label visible globally and retained
  per row for assistive technology. Existing noncompact layout remains intact.
- Transactions/Settings/Records only inherit shared wrapper/header/chip/nav changes.
  No API/domain/payment/PayPal/rules/deadline/audit/data model/dependency changes.
- Required checks on Node 22.23.4: npm test (497/48 files), typecheck, build and diff
  check passed. Browser: 59 page checks plus failed-chain cases; no runtime errors
  or unintended write requests, all Home taps >=44px, 416 text size/contrast checks
  pass. Role switching keeps page/filter URLs and keyboard focus. Reviewer API
  returns 403 without its configured code, 200 with the synthetic local code.
  Final browser results/captures: docs/ui/screens/creident-home/, including
  390px light/dark roles, actual action routes, amount toggle, keyboard focus, role
  URL/filter retention, reviewer gate, empty and failed cases; desktop comparison
  covers all 24 page/role/theme combinations at 1440 against baseline 9a1acd1.
- QA fixtures /tmp/creident-mockup-baseline.sqlite (13 deals), creident-home-empty.sqlite,
  creident-home-failed.sqlite (isolated deliberate corruption); no test DB committed.
  Before/after desktop captures under /tmp/creident-mockup-baseline and
  /tmp/creident-mockup-after. Scripts /tmp/creident-home-check.mjs and
  /tmp/creident-home-extra.mjs. UI.md and screenshot README updated.
- Implementation commit `6ffae06` pushed to origin/ui/creident-mockup. Final browser:
  59 page checks and 416 text/contrast checks pass; 24/24 desktop captures identical.
  PR create attempted once and failed: GitHub GraphQL API Forbidden. No PR exists
  from this agent. Manual link:
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-mockup
  PR body ready in /tmp/creident-mockup-pr.md. Final docs commit records push status.
  No owner decision pending. No main push, merge or deployment.

### 2026-10-25 — Mobile Records matches the NexoBank design

- Fetched main: PR #85 is merged at `5f191f4`. Took the requested merged-branch path:
  created `ui/nexobank-records` from latest `origin/main`; no main push or merge.
- Added RecordsShell with shared mobile brand/role header, rounded panel, mobile Back
  to Records and retained RecordMenu; desktop keeps its original header/geometry.
  `/audit` gets a verified/failed summary, icon explainer link and item/status/step
  rows with actual source data. Detail keeps ChainStatus/AuditEvent and expandable
  hashes; mobile-only timeline styles improve focus, touch targets and failed-step
  readability. Explainer body copy unchanged. EmptyState stays within the panel.
- Only audit page presentation, the new shell and scoped CSS changed. No audit hash,
  checkpoint/signing, API/model/state/payment/rules/deadline changes or dependencies.
- `npm test`: 497 tests/48 files passed; explicit typecheck and production build passed.
  Browser checks: all three pages at 390/1440, light/dark, Buyer/Seller/Reviewer;
  keyboard record links/details, hash expansion, CSV (Reviewer with existing code),
  role switching preserving URLs, no overflow/errors/write requests. Failed list/
  detail covered all width/theme/role combinations, actual failure links/anchors and
  later-step warnings. Empty list checked for all roles. Contrast/text probe: 952
  visible strings, no failures. Existing Reviewer export access checks remain intact.
- Seed data had 13 valid chains. Failure coverage used a separate temporary database
  copy with two invalid appended fingerprints, failing at step 9; neither verifier
  nor append-only triggers nor the verified fixture were altered. No test DB committed.
- Implementation `87aa2dd` pushed to `origin/ui/nexobank-records`. PR creation was
  attempted once and failed with `Post https://api.github.com/graphql: Forbidden`.
  No PR created by the agent. PR body: `/tmp/creident-nexobank-records-pr.md`.
  Manual link: `https://github.com/Ilham-Musyafa/Creident/pull/new/ui/nexobank-records`.
  No merge or Render deployment performed.
- Screenshots: `docs/ui/screens/nexo-records/`, including six mobile page/theme views,
  full-page versions, failed cases and one desktop shot. All six desktop comparisons
  (three pages x light/dark) are pixel-identical to baseline `5f191f4`, with digest
  evidence in `desktop-comparison.json`. No owner product decision remains pending.


### 2026-10-24 — Approved compact role dropdown

- Continued `ui/nexobank-home` (main still `9144b8c`, PR #84). Owner approved replacing
  the avatar/direct Buyer-Seller toggle with a compact role pill and dropdown.
- QuickRoleSwitch now offers Buyer/Seller/Reviewer with descriptions, an active check,
  native auto-popover top-layer rendering, viewport positioning, keyboard navigation,
  light dismissal and focus restoration across role-keyed refreshes. The shared header
  applies it to Home, Transactions and Settings; current-page/filter state is retained.
- Preserved demo-role cookie, server refresh and reviewer gates. No real auth/account
  changes, API/payment/rule changes or dependencies. Selecting the same role closes
  without refresh. Header becomes shorter with the single-row pill.
- Typecheck, production build and 497 existing tests pass. Browser verification: 12
  width/theme/page combinations (320/390, light/dark, Home/Transactions/Settings), all
  three roles in each; active checks, arrow/Home/End/Tab/Escape focus, outside/resize
  dismissal, no clipping/overflow/errors/write requests; reviewer gate remains 403
  without code. Also checked Transactions query retention and scroll dismissal.
  Open-menu text/contrast probe checked 108 strings with no failures.
- Latest screenshots: `docs/ui/screens/role-dropdown/` (390px, open/closed, light/dark).
  Prior captures retain the older avatar header. Changes stay in the same review
  branch; no merge or Render deployment. PR API creation remains blocked (Forbidden).
  Review/create: `https://github.com/Ilham-Musyafa/Creident/pull/new/ui/nexobank-home`.


### 2026-10-24 — Matching mobile Transactions reference

- Continued `ui/nexobank-home` for the owner's NexoBank Analytics screenshot, adapted
  to Transactions. `origin/main` remains `9144b8c` (PR #84), so the Home/Settings/
  Transactions design pass stays in one unmerged branch for review.
- Reused shared mobile brand/role header and rounded panel. Added an actual visible-row
  count card, search-aware action/Active/Closed shortcuts, native five-option view
  selector and existing quick tabs/grouped rows. Search opens on demand with focus;
  URL queries open it automatically. No made-up expenses, dates, cards or percentages.
- Passed the current role through TransactionsBrowser; reused filters/search/URL logic
  and actual next-action links. Unified mobile/desktop empty-list seed handling. Added
  optional AppShell mobileFullBleed only for `/deals`; new/detail pages retain padding.
  Desktop table/filter/search structure remains unchanged. No dependencies or
  domain/rules/payment/auth/API changes.
- Typecheck, build and all 497 tests passed. Production browser checks covered 18
  width/theme/role combinations (320/390/1024, light/dark, all roles): summaries,
  search/filter/counts, URL reload and invalid-filter fallback, actual next-step routes,
  role toggle, no writes/runtime errors/overflow. Empty-list checks for all roles at
  mobile/desktop, demo seed and unchanged new/detail page padding also passed.
  Default Transactions text/contrast probe checked 196 visible strings, no failures.
- Captures: `docs/ui/screens/nexo-transactions/`. Same review branch as Home/Settings;
  no merge or Render deployment. Prior PR API creation was blocked with Forbidden.
  Review/create: `https://github.com/Ilham-Musyafa/Creident/pull/new/ui/nexobank-home`.


### 2026-10-24 — Matching mobile Settings reference

- Continued `ui/nexobank-home` with the owner's Settings screenshot. `origin/main`
  remains `9144b8c` (PR #84); the Home design branch is not merged. Keep both designs
  in the same branch/review rather than stacking another branch on unmerged work.
- Added MobileSettings: shared wave/brand/quick-role header, rounded panel and seven
  outline rows. Demo role/Appearance/Demo data expand on demand using native details;
  reviewer oversight appears only for Reviewer. Remaining rows use existing decision,
  fairness, limitations and About routes. Records stays in the bottom navigation.
  Desktop Settings markup/layout retained. No fake account or notification controls.
- Extracted MobileBrandHeader from Home without visual changes. Mobile reviewer form
  gets a unique input ID; default desktop form ID remains unchanged. Theme pickers
  observe document theme changes so mobile/desktop selections stay synced on resize.
- Typecheck, production build and all 497 tests passed. Production browser checks:
  320/390/1024px x light/dark x all roles; native keyboard disclosures, one open group,
  theme persistence and resize sync, role switches, duplicate IDs, password input,
  wrong/correct local reviewer code (403/200), demo seed, links, no overflow/errors.
  Default Settings text/contrast probe checked 68 visible strings with no failures.
- Captures: `docs/ui/screens/nexo-settings/`. Updated branch will include these changes;
  no merge or Render deployment. Existing PR API restriction remains (Forbidden);
  review/create via `https://github.com/Ilham-Musyafa/Creident/pull/new/ui/nexobank-home`.


### 2026-10-24 — NexoBank-inspired mobile Home

- PR #84 is merged on `origin/main` at `9144b8c`. Created `ui/nexobank-home` from
  that commit for the owner's supplied NexoBank Home screenshot.
- Replaced mobile Home composition with original CSS Sapphire waves, inverse brand
  header and role toggle, rounded content panel, approved-payment amount show/hide,
  four functional shortcuts, role-specific primary action, compact actual counts,
  three recent/reviewer rows and the existing audit/demo footer. No banking metrics,
  deposit/transfer/contact actions or borrowed reference assets. Kept current-role
  actions/About on demand with focus handling and empty/seed support.
- Floating mobile nav retains Home/Transactions/Records/Settings labels and safe-area
  padding. Desktop Home remains pixel-identical in light/dark at 1440px. Other mobile
  pages receive the same navigation; their content layout is unchanged.
- No dependencies, domain/rules/payment/auth/API changes. Existing 497 tests, typecheck
  and production build pass. Browser checks covered 18 width/theme/role combinations
  at 320/390/768, amount hiding, actions/About, focus, actual rows, no horizontal
  overflow, no runtime errors or write requests; quick role toggle; final typography
  captures at 320/390 and empty/seed flows. Text/contrast probe checked 510 visible
  strings across Home/Transactions/Records/Settings, light/dark, no failures.
- Implementation commit `ea71b76` pushed to `origin/ui/nexobank-home`. One PR
  creation attempt failed: `Post https://api.github.com/graphql: Forbidden`.
  No PR created by the agent. Body: `/tmp/creident-nexo-home-pr.md`.
  Open `https://github.com/Ilham-Musyafa/Creident/pull/new/ui/nexobank-home`.
- Screenshots: `docs/ui/screens/nexo-home/` (viewport and full page, light/dark).
  This is mobile web styling; no native app or Render deployment was performed.


### 2026-10-24 — Main mobile reference foundation

- Owner requested adapting the supplied mobile finance reference to Creident and
  iterating afterward. Branch `ui/mobile-reference` starts from `origin/main` at
  `4730df4` (merged PR #83); no merge or live deployment performed.
- Added mobile Home with a soft blue approval card, two pending-action previews,
  on-demand actions/About, existing quick role switch, count tiles and chain checks.
  Shared `HomeData` keeps desktop and mobile sourced from the same server facts.
- Added grouped mobile Transactions, three quick tabs, native expandable full filters,
  bounded search and existing URL persistence. Shared mobile rows retain actual
  status/amount/action/deadline and separate Demo badges. Refined four-item bottom
  navigation; no central New button, banking metrics or new dependencies.
- Verified typecheck, production build and all 497 existing tests. Browser checks:
  18 width/theme/role combinations (320/390/768, light/dark, all roles), actions/About,
  search/filter counts and reload, overflow, runtime errors; direct Buyer/Seller toggle;
  empty states and loading demo deals. Text/contrast probe checked 296 visible strings
  with no failures; gradient endpoints separately checked. Desktop Home/Transactions
  light/dark screenshots at 1440px remain pixel-identical to the baseline.
- Implementation commit `d891771` pushed to `origin/ui/mobile-reference`. GitHub PR
  creation was attempted once and failed with `Post https://api.github.com/graphql:
  Forbidden`. No PR was created by the agent. Body: `/tmp/creident-mobile-reference-pr.md`.
  Open: `https://github.com/Ilham-Musyafa/Creident/pull/new/ui/mobile-reference`.
- Final screenshots: `docs/ui/screens/mobile-reference/`. The web app remains a
  Sandbox/simulated prototype; these are mobile web styles, not a native app.


### 2026-10-24 — Desktop Home with progressive disclosure

- Branch `ui/desktop-home` from merged PR #82 (`bfd6c1a`). Owner requested Web first,
  with a clean Home and details shown only after selection, inspired by paired-card
  finance references. Desktop now defaults to two summary cards and a compact view
  selector. Actions, recent/review-queue rows, audit and About are opened explicitly.
- Kept actual approved-but-uncharged amount/counts and existing routes/actions. No
  wallet, earnings, APY, rewards or KYC features/claims were added. Audit mismatch
  warnings and a demo/payment-mode/no-real-money footer remain visible.
- Added DesktopHome; server passes existing fact-based view rows/counts. Cached Draft
  acceptance reads for consistent mobile/desktop prompts. DemoGuide supports optional
  unique IDs/dismiss callback for the desktop About panel; default mobile behavior and
  preference are retained. No dependencies, state/rule/payment/API changes.
- Verification: 497 tests (48 files), typecheck and production build passed. Browser
  checked all roles at 1024/1440px light/dark (12 flows): Overview-only default, selected
  action/recent/audit/About panels, role switching, unique IDs, focus, reload reset and
  no overflow/console errors; these interactions sent no POST requests. Empty panels
  checked for all roles; explicit load-demo refresh and existing action route passed.
- Saved mobile baselines before edits. All 12 360/390px × light/dark × role captures
  were pixel-identical afterward (full PNG comparison, no masks). Mobile first-visit
  introduction/dismissal also passed. No mobile redesign in this task.
- UI.md updated; six review screenshots in docs/ui/screens/desktop-home/ (~452KB).
  Committed and pushed. PR creation returned GitHub `Forbidden`; open
  `/pull/new/ui/desktop-home` manually. PR body: `/tmp/desktop-home-pr.md`.
  Await review/merge; no merge or deployment performed.


### 2026-10-24 — Searchable, action-aware Transactions list

- Branch `ui/transactions-list` from merged PR #81 (`46e619a`). Owner approved a
  desktop column list/mobile cards, item search, per-role action filter/counts,
  deadline-first priorities, category icons and separate Demo badges.
- Added a pure presentation helper and small client browser. Reuse existing
  `nextAction`, acceptance facts, statuses/deadlines and routes; clicking a row opens
  the next step or detail without sending an action. Pending refunds remain pending,
  with no retry offered. Search/filter URLs retain `filter=review`; validate own filter
  keys and bounded queries. Titles remain plain React text.
- Badge replaces only the displayed leading `[Demo]` on Transactions. Stored names,
  demo terms and simulated audit flags are untouched. Item icons are decorative
  category/title hints with a package fallback. No new dependencies or API/rule changes.
- Verification: 497 tests (48 files; 8 new presentation tests), typecheck and production
  build passed. Browser checked all 3 roles at 360/390/1024/1440px light/dark (24 flows):
  live search, filter counts, priority order, demo badges, URL/reload, invalid filter
  fallback, keyboard navigation and no overflow/console errors. Filter/search/open-row
  flows sent no POST requests. Empty/load-demo and literal injection-like item/query
  text plus 200-character query bounds passed against a temporary simulated database.
- Four review captures in docs/ui/screens/transactions/. UI.md updated. Pushed successfully.
  GitHub PR creation returned `Forbidden`; open `/pull/new/ui/transactions-list` manually.
  PR body: `/tmp/transactions-list-pr.md`. Await review/merge; no deployment performed.


### 2026-10-24 — Four-item navigation and Settings cog

- Owner requested removing + New and renaming Menu with a settings gear. Shared
  desktop/mobile navigation now has Home, Transactions, Records, Settings. Added an
  original inline SVG cog; removed the unused New/FAB icon and styling.
- Settings page title and visible role/access instructions now use Settings. Kept
  `/menu` and internal Menu active keys compatible. New deal highlights Transactions;
  Seller Home's + New deal link still opens the existing form.
- Verification: 489 tests, typecheck, production build and diff check passed.
  Chromium at 360/390/1024/1440px light/dark (eight flows) verified four links, no New
  nav entry, cog/current Settings state, Transactions current on the form, Home's
  create link, no overflow or console errors. Review captures in
  docs/ui/screens/settings-navigation/.
- Continued pending `ui/menu-settings` branch, including the approved settings
  layout/theme previews. No dependencies, route renames or business-rule changes.


### 2026-10-24 — Menu & settings inspired by shadcn

- Branch `ui/menu-settings` from merged PR #80 (`cbe6188`). Owner requested a more
  attractive settings/menu layout inspired by shadcn. Added grouped panels, contextual
  desktop section navigation, demo workspace summary, inline SVG icons and clearer
  link hierarchy. Mobile remains stacked with the existing bottom navigation.
- ThemeSelector has an optional visual-preview variant on Menu; original icon variant
  remains on styleguide. Previews use stable named palette tokens; actual theme,
  storage/System behavior, role cookie, reviewer code form and seed API are reused.
- Kept demo/no-real-sign-in labels; code requirements match configuration. Reworded
  records/evaluation link summaries to avoid claims beyond chain/replay checks.
- Verification: 489 tests (47 files), typecheck and production build passed. Chromium
  covered three roles at 320/360/390/1024/1440px in light/dark (30 combinations): no
  horizontal page overflow or console errors; theme persistence, keyboard selection,
  System OS following, stable previews, role refresh and section anchors passed.
  Wrong reviewer code returned 403 and correct code 200; no-code configuration hides
  the code form. Seed control, blocked-storage fallback and default styleguide picker
  also checked. Contrast/minimum-size spot audit: 562 Menu/styleguide text samples in
  light/dark passed AA thresholds and 12px minimum (not a full WCAG certification).
- UI.md updated; four review captures in docs/ui/screens/menu-settings/ (~512KB total).
  No new dependencies, authentication, payment/state changes or new endpoints.
- Pushed successfully. GitHub PR creation returned `Forbidden`; open
  `/pull/new/ui/menu-settings` manually. PR body: `/tmp/menu-settings-pr.md`.
  No merge or deployment performed.


### 2026-10-23 — Readability, product introduction and About

- Owner approved these three priorities. Raised explanatory/help/subtitle copy to
  14px and former 11px status/navigation/technical labels to at least 12px. Increased
  oversight table/body text to 14px; brand signature and existing font pairing remain.
- Replaced Home's short demo guide with a three-step product introduction before the
  dashboard (terms → PayPal approval → R1–R7/evidence/human dispute review). Role CTA
  buttons reuse demo cookies and refresh Home; no transactions or payments are made.
  Intro is dismissible/reopenable, handles blocked storage, restores keyboard focus,
  and states simulated/Sandbox mode and reviewer access-code limits accurately.
- About uses native R1–R7 accordions, clear section headings and expandable bridge/
  limitation details. Core demo/no-money/no-sign-in/no-payout limits and audit rewrite
  caveat stay visible. Replaced stale hard-coded eval counts with a link to the current
  results and retained replay caveats. No state/rule/payment changes or dependencies.
- Verification: 489 tests (47 files), typecheck and production build passed. Browser
  layout/font/theme checks covered 15 pages × 360/390/1024/1440px × light/dark (120
  combinations), with no horizontal page overflow or unexpected console/page errors;
  existing AG Studio missing-license notices only. Final intro/About interactions
  passed for all three roles across the same widths/themes (24 flows), including
  persistence/reopen, focus, keyboard accordions, unchanged URL and no write requests.
- Contrast/minimum-size spot audit: 1,218 visible text samples on Home, Transactions,
  New deal, About, Fairness, styleguide, Records and Menu in light/dark had no failures
  against 12px minimum and AA contrast thresholds (4.5 normal / 3 large). Existing
  palette passed, so no color changes were needed. This is not a full WCAG certification.
- Full-page review captures (390/1440, light/dark) in docs/ui/screens/readability/;
  viewport height expanded for capture so fixed mobile tabs sit at the image bottom.
- Continued pending `ui/quick-role-switch` branch to avoid stacking an unmerged task;
  includes the previously approved mobile Buyer/Seller shortcut. Pushed successfully.
  GitHub PR creation returned `Forbidden`; open `/pull/new/ui/quick-role-switch`
  manually (or update the existing PR). Body: `/tmp/creident-readability-pr.md`.
  Await review/merge; no deployment or merge performed.


### 2026-10-23 — In-place mobile demo role toggle

- Branch `ui/quick-role-switch` from merged PR #79 (`9c6c372`). Owner requested that
  tapping the Home avatar switches roles without opening settings. New small client
  component toggles Buyer ↔ Seller via the existing `hv-role` cookie and refreshes
  the current page. Pending disables repeat taps; title/accessibility label identifies
  the next role, with a small swap icon. Reviewer selection/gate stays in Menu;
  a reviewer can use the shortcut to return to Buyer. No real authentication added.
- Verification: 489 tests (47 files), typecheck, production build and diff check passed.
  Chromium at 360/390px light/dark verified click/keyboard toggle both ways, unchanged
  Home URL, persisted role after reload, updated role summary, 44px target, no overflow
  or console errors. Reviewer-to-buyer and unchanged desktop greeting also checked.
- Updated docs/UI.md; review captures in docs/ui/screens/quick-role/. No dependencies
  or business logic changes. Pushed successfully; PR creation returned GitHub `Forbidden`.
  Open `/pull/new/ui/quick-role-switch` manually; body: `/tmp/quick-role-pr.md`.


### 2026-10-23 — Compact mobile Home identity

- Owner requested reducing crowding around “Hi, Demo Buyer”. Mobile Home now pairs
  the logo with a compact avatar/role link on the right; tapping it opens Menu's
  existing role controls. Removed the separate mobile greeting/instruction row.
  Desktop greeting stays unchanged; mobile retains a screen-reader Home heading.
- Verification: typecheck, production build and diff check passed. Chromium checked
  buyer/seller/reviewer at 360/390/1440px in light/dark (18 combinations): no overflow
  or console/page errors, mobile greeting hidden, role control ≥44px with visible
  keyboard focus, role link reaches Menu, desktop greeting unchanged.
- Review screenshots: docs/ui/screens/mobile-header/. Continued pending
  `ui/icon-only-menu` UI polish branch; no dependencies or business logic changes.


### 2026-10-23 — Plain payment and review wording

- Owner approved replacing confusing payment terms: status badges/timelines now use
  “Payment approved · not charged yet”, “Refund issued”, “Partial refund issued”,
  “On hold · PayPal dispute”; VOIDED retains “Cancelled · not charged”. Recommendations
  use “Needs a reviewer”. Charge/approval/receipt/about/styleguide copy is aligned.
- Retained pending-return/refund wording and the distinction between cancelling an
  uncharged approval and refunding a charged payment. Removed misleading guaranteed
  charge wording from the payment-approval window. Stored codes, API values, audit
  chain data, rule/state transitions and PayPal calls are unchanged.
- Updated UI.md label tables and existing assertions for the changed frozen timeline
  and partial refund receipt wording. No new dependencies.
- Verification: 489 tests (47 files), typecheck, production build passed. Chromium
  checked 15 pages at 390/1440px in light/dark (60 checks): no horizontal overflow or
  unexpected console/page errors; existing AG Studio missing-license notices only.
- Continued pending `ui/icon-only-menu` branch, including the prior icon-only trigger.
  Pushed successfully; PR creation returned GitHub `Forbidden`. Open
  `/pull/new/ui/icon-only-menu` manually; body: `/tmp/plain-payment-pr.md`.


### 2026-10-23 — Icon-only desktop menu button

- Owner requested removing the visible “Menu” label. Desktop trigger now shows only
  the hamburger icon in a 44px circular button; aria-label/title preserve its name.
  Drawer behavior and mobile navigation unchanged.
- Verification: inspected the JSX diff, `npm run typecheck` and `git diff --check` passed.
- Branch `ui/icon-only-menu` from merged PR #78. No new dependencies.


### 2026-10-23 — Modern New deal form

- Branch `ui/new-deal-layout` from merged PR #77 (`50d64e3`). Owner approved grouped
  Item details / What’s included / Buyer checks sections, editable list rows, live
  transaction summary, collapsed AI assistance and clearer create-link copy.
- Summary uses actual configured time values, sticks on desktop, and precedes submit
  on mobile. Existing API payloads, seller acceptance, templates and AI receipt/manual
  restore flow retained. No business-rule changes or dependencies.
- Verification: 489 tests (47 files), typecheck and production build passed. Chromium
  at 390/1440px in light/dark exercised add/remove rows, template merging, preview
  counts/price, AI replay apply/manual restore (price retained), and actual create +
  seller acceptance through the local API. No page overflow or console errors.
- Four synthetic-data review captures in docs/ui/screens/new-deal/. Environment
  briefly disconnected before commit; recovered workspace and verified files intact.
- Pushed successfully. GitHub PR creation returned `Forbidden`; open
  `/pull/new/ui/new-deal-layout` manually. PR body saved at `/tmp/new-deal-pr.md`.


### 2026-10-23 — Transactions navigation label

- Owner requested “Transactions” instead of “Deals” on the navigation tab; changed
  the displayed label in mobile/desktop navigation and the list page heading.
  Internal active keys and `/deals` URLs remain compatible.
- Verification: typecheck and production build passed. Chromium checked the heading,
  navigation label/current state/link target, overflow and console at 360/390/1440px
  in light/dark (six combinations); all passed.
- Pushed as a follow-up on `ui/remove-limitations-arrow` (PR #77); no dependencies.


### 2026-10-23 — Home demo guide and task priorities

- Owner approved the Home recommendations: added a four-step dismissible/reopenable
  demo guide, role-specific task summaries and deadline-first action ordering.
  Remaining times use full words; overdue items say “Deadline passed”. Mobile actions
  appear before recent deals. No transaction rules, permissions or deadlines changed.
- `DemoGuide` stores only a viewer dismissal preference (try/catch); links use existing
  deal/review/audit pages and clearly explain switching demo roles in Menu.
- Verification: 489 tests, typecheck and build passed; 12 Chromium Home combinations
  (buyer/seller/reviewer × 390/1440 × light/dark) passed. Checked guide links,
  dismissal/reload/reopen, no overflow/errors and mobile content order. Independently
  verified action order against the temporary demo database's stored deadlines.
- Updated docs/UI.md; review screenshots in docs/ui/screens/home-guide/. Continued
  pending UI branch `ui/remove-limitations-arrow`, no dependencies added. Await review/merge.


### 2026-10-23 — Desktop slide-out navigation

- Owner requested a desktop Menu button instead of the always-visible sidebar.
  Added `DesktopNavigation` with a left-edge modal drawer sliding to the right;
  main content uses the available width. Existing bottom navigation stays on mobile.
- Supports close button, outside click, Escape, focus containment/restoration,
  scroll lock, close on navigation/mobile resize and reduced-motion preference.
  Updated docs/UI.md; screenshots in docs/ui/screens/navigation/.
- Verification: 489 tests, typecheck and build passed. Chromium light/dark at 1440px
  exercised keyboard loops, dismissal, links and reduced motion; resizing to 390px
  restored scrolling and showed only the mobile navigation. No overflow/console errors.
- Continued the pending `ui/remove-limitations-arrow` UI polish branch; includes prior
  arrow removal and action badge alignment. No new dependencies. Not merged.


### 2026-10-23 — Align Home action status badges

- Follow-up Home polish on `ui/remove-limitations-arrow`: action status badges now
  share a 128px width, centered text/content and balanced line wrapping. Other uses
  of StatusPill keep their existing layout through an optional className prop.
- Verification: typecheck and production build passed; Chromium buyer Home at
  360/390/1440px in light/dark passed (five centered badges, no overflow or console errors).
- Included with the pending Home arrow change to avoid stacking an unmerged branch.


### 2026-10-23 — Remove Home limitations link arrow

- Owner requested removing the trailing arrow from “View limitations”. Updated only
  that link label; destination and accessible tap target are unchanged.
- Verification: inspected the one-line JSX change; `npm run typecheck` passed.
- Branch `ui/remove-limitations-arrow`; no dependencies or business logic changes.


### 2026-10-23 — Owner-approved application font pairing

- Branch `ui/creident-font-pair`: Plus Jakarta Sans for headings, DM Sans for body,
  navigation, forms, buttons and amounts. Georgia/Arial brand signature unchanged.
- Reused the existing Jakarta asset; added only a local DM Sans variable WOFF2 and its
  OFL license from Fontsource 5.3.0. No package dependencies or business logic changed.
- Updated UI/brand/README typography guidance and added four Home review captures in
  `docs/ui/screens/fonts/` (390/1440px, light/dark).
- Verification: 489 tests (47 files), typecheck and production build passed. Chromium
  checked 15 pages at both widths/themes (60 checks): no horizontal overflow or
  unexpected console/page errors; only existing AG Studio missing-license notices.
  Fonts load locally; theme switching and brand assets passed. Live deployment awaits merge.
- Pushed branch successfully. PR creation via GitHub GraphQL returned `Forbidden`;
  owner can open `/pull/new/ui/creident-font-pair` in the canonical Creident repo.
  Prepared PR body: `/tmp/creident-font-pr.md`.


- 2026-10-23 (Codex, owner-requested brand-kit application): branch
  `ui/creident-brand-kit` from latest main 1b9bc1e. Applied the uploaded nine-page
  Creident Brand Guidelines PDF (Sapphire Flow), which supersedes the older
  Mint/diamond/Jakarta visual direction. Preserved the PDF's original navy-arc and
  white-arc raster C symbols with their transparency; no approximate vector logo
  or recolouring. Added reusable 200px-minimum signature, exact tagline, adaptive
  favicon, Apple icon, PNG/ICO/app-tile exports and source PDF/provenance docs.
  CSS tokens now use navy/sapphire/sky/ice with accessible supporting light/dark
  values; normal sapphire button/chart-label text uses darker navy for AA.
  Georgia major headings/wordmark, Arial interface, no font download; historical
  Jakarta files retained unused. Records nav uses a document rather than shield;
  256px desktop sidebar fits the full signature; mobile Home/About show it too.
  README lead screenshot, brand guide and docs/UI.md updated. No new dependency,
  state/rule/payment/auth changes or Render deployment. Existing prototype/AI/demo
  limitations retained. Checks: 489 tests (47 files), typecheck and production build
  pass. Chromium: 15 pages x 390/1440 x light/dark = 60 checks, no horizontal page
  overflow or unexpected console/page errors, no web-font requests; tested System
  logo switching and 16/32/48px favicon/ICO/Apple assets. Only expected AG Studio
  missing-key evaluation messages remain. Brand contrast checks pass at >=4.5:1.
  Screenshots: docs/ui/screens/brand/ (Home, New deal, About, Review, Receipt,
  Oversight in all four combinations). Pushed implementation commit 5fffb2a.
  `gh pr create --repo Ilham-Musyafa/Creident --base main --head
  ui/creident-brand-kit` returned `Post https://api.github.com/graphql: Forbidden`
  (403); no PR created or merged. PR description: /tmp/creident-brand-pr-description.md.
  Owner/Claude can open the one review PR at
  https://github.com/Ilham-Musyafa/Creident/pull/new/ui/creident-brand-kit.
  No Render deployment performed; do not merge automatically.
- 2026-10-22 22:30 WIB (Claude): public-demo hardening for Render. `PUBLIC_DEMO=1` locks the
  server to PAYPAL_MODE=simulated + AI_MODE=replay and exits at start if PP_ID, PP_SECRET,
  AI_API_KEY or AUDIT_SIGNING_KEY is set (src/lib/publicDemo.ts, src/instrumentation.ts,
  src/lib/publicDemoStartup.ts); demo deals load on start; src/proxy.ts rate-limits /api per
  client (30 writes, 240 reads per minute, in memory, public demo only); security headers in
  next.config.ts; render.yaml Blueprint (free plan, oregon, auto-deploy on commit to main);
  docs/DEPLOY.md owner steps. Fixed a stale Postman assertion ("Demo PayPal approval") and the
  README demo-deal count (13). Repo links updated to Creident. Checked: tests, build, unsafe
  env exits 1, safe env seeds 13 deals, headers present, 429 after 30 writes, newman 40/93,
  key pages without console errors. Next: owner creates the Render Blueprint; Workflows later.
- 2026-10-22 21:15 WIB (Claude, owner decision): renamed the project to **Creident** (supersedes
  the 20:55 "HalcyVault locked" entry, which was a mis-click). UI brand, page title, About,
  README, AGENTS.md, DESIGN.md, UI.md, sponsor and sandbox notes, Postman collection file name,
  PayPal evidence notes/PDF name, courier name, package name, theme storage key, reference
  prefixes HV- -> CR-, DB env/default path (old env name kept as fallback).
- 2026-10-22 20:55 WIB (Claude, owner decision): name locked as HalcyVault; "(working name)"
  removed from README, AGENTS.md and DESIGN.md. Hosting on Render confirmed; next: public-demo
  hardening and render.yaml before the owner creates the service.
- 2026-10-22 19:50 WIB (Claude, owner request): Home section "Recent deals" renamed "Recent
  transactions". The rest of the app keeps "deal" (owner decision).
- 2026-10-22 19:40 WIB (Claude, owner request): Records failure states. Index: failed records
  sort first with a warning border, banner button "View affected record(s)". Record page: the
  first mismatching step shows "Verification failed here", later steps are dimmed with "Cannot
  verify after the failed step" (verifyChain stops at the first break), status box links "Go to
  step #N". All step details stay closed on load. Tested on a VACUUM INTO copy of the demo DB
  with the events_no_update trigger dropped in the copy only (13 records, same as normal).
- 2026-10-22 18:20 WIB (Claude, owner request): Records in two levels. Index: one status box
  "✓ N records verified" + "Verified on this server" (or "...and against the sealed copy from
  <date>") + link "How verification works"; deal rows show name, status and step count, with
  a warning only for a failed step or a sealed-copy mismatch. Record page: "15 of 15 steps
  verified", rows without per-step badges ("⚠ Not verified" only on failure), details on tap,
  Export moved to a "⋯" menu (Download as CSV, How verification works). New page
  /audit/how-it-works holds the sealed-copy explanation and what a same-server check does not
  prove. Home and the oversight widget say "verified" instead of "intact". Checked with a
  tampered DB copy: failure states render correctly.
- 2026-10-22 18:00 WIB (Claude, owner request): Appearance picker in Menu is now three icon
  tiles (sun Light, moon Dark, half circle System on the right) with labels under the icons.
- 2026-10-22 20:30 WIB (Claude, owner request): clarity pass 2. Demo decision reasons say
  "Cancel the payment authorization once the return is received" (matches "not charged";
  only freshly seeded demo data). Home total labelled "Approved, waiting to be charged · N
  open deals". One short demo line on deal and checkout instead of a big notice. Checkout
  button "Accept terms & continue". Record rows show title, time and "Intact"; step number,
  actor, source and fingerprints open on tap. Records index merges the sealed-copy note into
  the single status box. Tests 482 passed, build OK, 390px screenshots without console errors.
- 2026-10-22 19:20 WIB (Claude, owner request): plain-language pass. Glossary in docs/UI.md
  "Plain language" (approved -> not charged yet, captured -> payment completed, voided ->
  payment cancelled, audit log -> deal record, hash -> fingerprint, checkpoint -> sealed
  copy, simulated -> demo). Applied to statuses, timeline, event titles, activity feed, deal,
  checkout, demo PayPal page, confirm sheets, receipt, records pages, oversight widget, menu
  and nav ("Records"). About and Fairness keep their technical explanations for judges.
  The receipt for a refund decided before capture now reads "Payment cancelled (after
  return)" (was "Authorization cancelled ..."). Tests updated to the new copy.
- 2026-10-22 18:40 WIB (Claude, owner-approved UI patterns): confirmation sheet before money
  moves (checkout, confirm receipt, every reviewer decision), receipt reference + Save as
  PDF, plain-language activity feed on the deal page, three-step dispute opening (old
  DisputeForm removed). Documented in docs/UI.md "Finance-app patterns". Browser-tested:
  sheets, Escape to cancel, partial refund via sheet -> PARTIALLY_REFUNDED, dispute steps ->
  evidence page, receipt at 1440 dark, feed at 390; no console errors or native dialogs.
- 2026-10-22 18:05 WIB (Claude): back link replaced by a round chevron icon button in PageHeader
  (owner choice); docs/UI.md updated.
- 2026-10-22 17:50 WIB (Claude, owner UI review): clarity pass. Payment wording ("Payment
  captured" instead of "Released to seller"; voided refund receipts say "Authorization
  cancelled (after return)"); New deal AI panel collapsed by default; "Next: ..." summary with
  time left and the main button above the deal timeline; evidence type labels shortened and
  the photo claim replaced with "text descriptions only, photo upload not available yet";
  review notice "R5 · Human decision required"; Fairness single summary (replay caveat
  visible, details on demand); audit metadata no longer splits short hashes and each event
  opens to show full hashes; oversight bars show integer labels (no tick-interval option in
  AG Studio, so value-axis labels are hidden) and a shorter licence notice. Fixed a hydration
  error: Notice rendered block content inside <p>; it is now a <div>.
- 2026-10-22 17:10 WIB (Claude, owner-approved UI polish during the freeze): motion pass
  (docs/UI.md "Motion"): page/list entrances, button press, shimmer loading, timeline and
  status pulses, Home count-up, one-time success burst, audit chain reveal. CSS only, no
  dependency, reduced-motion respected. Found and fixed: a leftover transform on <main>
  made fixed overlays scroll with the page (fill mode now backwards; burst uses a portal).
- 2026-10-22 16:30 WIB (Claude): reviewed and merged C21 AG Studio oversight (#59;
  482 tests, widgets render at 390/1440, only the expected licence messages without a key)
  and C22 Postman collection (newman run against main: 40 requests, 93 assertions, 0
  failures). Feature freeze declared.
- 2026-10-22 (Codex, C22): created `docs/c22-postman`
  from latest origin/main 765dc30, independent of the unmerged C21 review branch.
  Added Postman v2.1 collection at docs/postman/HalcyVault.postman_collection.json:
  40 ordered requests, explicit demo roles, loopback baseUrl, empty optional reviewer
  code, scripted deal/order/evidence/draft/case IDs and JSON-encoded draft bodies.
  Covers seed/reseed, both terms acceptances, simulated approval/authorization,
  delivered tracking, damage dispute, both sides' evidence, R5 recommendation,
  terms/courier/copilot/translation replays, advisory no-replay fallback, human
  refund with required return, pre-capture void, audit/CSV, a second captured deal,
  simulated external freeze/sync, inquiry message, confirmed claim escalation and
  locked PDF submission. No application or dependency files changed. First Newman
  attempt exposed a Postman reserved `data` variable collision; renamed script
  locals, then 40 requests / 93 assertions passed with zero failures. Final isolated
  run on a freshly built main server (localhost:3143, temporary SQLite file,
  PAYPAL_MODE=simulated, AI_MODE=replay, PP/AI keys and reviewer code empty):
  `npx --yes newman@6.2.3 run docs/postman/HalcyVault.postman_collection.json
  --env-var baseUrl=http://localhost:3143 --bail --reporters cli,json
  --reporter-json-export /tmp/c22-newman-final.json` -> 40 requests, 40 test scripts,
  41 prerequest scripts and 93 assertions, all zero failures (1 iteration, 1.216s).
  First seed returned 201, repeat seed 200; final verification covered all 14 deals.
  Production build passed. JSON scripts also parsed and loopback/mode guards were
  checked locally. Newman ran only through npx (cache in /tmp), not package.json;
  its Node 24 fs.F_OK deprecation warning is from the temporary CLI. README has a
  short Try the API subsection. No real Sandbox/webhook/live-provider run claimed.
  Pushed implementation commit 1684382. `gh pr create --base main --head
  docs/c22-postman` failed with `Post https://api.github.com/graphql: Forbidden`
  (403); no PR created or merged. Full English PR text and Newman result table:
  `/tmp/c22-pr-description.md`. Owner/Claude can create the one review PR at
  https://github.com/Ilham-Musyafa/HalcyVault/pull/new/docs/c22-postman.
  Claude reviews; do not merge automatically.
- 2026-10-22 (Codex, C21): branch `feat/c21-ag-studio` starts from
  main 765dc30 (C19/C20 merged). Added owner-approved AG Studio 3 React/core
  dependencies for the sponsor dashboard, loaded only at `/reviewer/oversight`.
  Reviewer/gate-protected GET `/api/reviewer/oversight` reads all local deals and
  audit events without provider calls or writes. Widgets cover dispute status/type,
  escalation denominator, deadline queue, recorded AI run/use counts, PayPal states
  and custom audit/checkpoint health. Seed now has 13 labelled deals, one captured
  simulated PayPal case and actual terms/copilot replays; unchanged older review
  seeds get the copilot replay too, without replacing evidence or decisions.
  Counters count observed events only and deduplicate reused drafts; terms previews
  and unavailable outbound attempts are not fully logged, so missing/ignored drafts
  cannot be inferred. No signed checkpoint is fabricated. README section 8 explains
  setup/dependency reasons, limitations and the four committed screenshot links.
  Final gates: 482 tests (45 files), typecheck and production build pass; runtime
  dependency audit reports zero findings. Chromium at 390x844 and 1440x900, light
  and dark: seven widgets, no horizontal page overflow, no unexpected console or
  page errors, no writes or external requests from the dashboard. Only the seven
  AG Studio missing-key console lines per load remain (owner-approved evaluation).
  Home and a denied oversight page did not download the Studio runtime chunk.
  Full-page PNGs in docs/ui/screens/oversight-*.png are 146–173 KiB each, captured
  after allowing Studio to repaint at full height. No key registered, supplied,
  stored or logged; owner still supplies AG_STUDIO_LICENSE_KEY on 7–8 Nov and
  checks public-demo/trial permission. Optional Studio agent was not added.
  Pushed commits 20d8a7f and dff9dbb. `gh pr create --base main --head
  feat/c21-ag-studio` failed: `Post https://api.github.com/graphql: Forbidden`
  (403), as in earlier tasks. No PR was created or merged. Complete English PR
  description, dependency reasons and screenshot links: `/tmp/c21-pr-description.md`.
  Owner/Claude can open the single PR at
  https://github.com/Ilham-Musyafa/HalcyVault/pull/new/feat/c21-ag-studio.
  C22 not started. Claude reviews; do not merge automatically.
- 2026-10-22 15:20 WIB (Claude): reviewed and merged C19 partial refund (#57; simulated
  browser run: DECISION -> PARTIAL_REFUND_CAPTURED -> PARTIAL_REFUND_COMPLETED, receipt
  correct) and C20 evidence translation (import-only conflict on the review page resolved;
  474 tests, build, browser check 390 light / 1440 dark). AI assists 1-5 are all merged.
  Next for Codex: C21 AG Studio dashboard (no key), then C22 Postman collection.
- 2026-10-22 08:45 WIB (Codex, C20): implemented and verified on
  `feat/c20-evidence-translation`, independently based on current main b966c8d
  (C18 merged; C19 remains a separate review branch). runAssist feature translate,
  promptVersion translate-v1 takes exactly one original text and target en/id.
  Strict two-key output bounds translation at 8,000 characters and language at
  en/id/unknown. Validator preserves numeric/date/decimal tokens and occurrences,
  mixed alphanumeric/uppercase identifiers, explicitly labelled serials and
  existing URL/email/link targets; added links/codes/numbers are rejected.
  Conservative pattern checks may reject harmless localization and do not prove
  semantic accuracy or recognize every code format. The original stays authoritative.
  Reviewer-only POST `/api/transactions/{id}/ai/translate` validates evidenceId,
  target, body size and deal ownership; reviewer code gate applies on cache hits too.
  Cache uses existing ai_drafts feature translate with evidence/source hash,
  target/version/mode/model/provider scope (no API key); atomic cache+audit writes
  use a small repository helper. Same-process concurrent requests share a call;
  separate workers may duplicate an AI call on simultaneous misses but publish
  one row/event. Source changes invalidate cache; changes during the call reject
  the result. Failed attempts are logged but not cached, allowing manual retry.
  EVIDENCE_TRANSLATED contains ids, source/translation/prompt/output hashes,
  languages, mode/model and injection/unavailable metadata only, never either text.
  Cache hits add no event. No evidence/transaction/decision/recommendation changes.
  New EvidenceTranslation component puts Translate/target controls and result below
  each original, labelled "AI translation – check the original", with both full
  SHA-256 hashes, loading/fallback and injection warning. Text is plain React data.
  Replay covers both seeded evidence texts (watch photo/packing), their Indonesian
  equivalents in both directions/same-language echoes, plus a synthetic coded example.
  `npm test` 430/430 (41 files), typecheck, build and diff check passed. Production
  Chromium with fresh temp DB, simulated PayPal/replay: 390/1440px light/dark,
  both directions, two per-item controls, same-language echo, cache hits with one
  audit per source/target, unchanged original/state/rules summary, injection fallback,
  plain-text script rendering and hidden buyer controls. No overflow or console
  errors/warnings; read-back chain verified. DESIGN 6.1 updated; no dependencies.
  Rules, state machine, evidence summary, PayPal/bridge and protected drafts/UI
  modules untouched. Real live-provider translation remains pending. C21 not started.
  All work is committed and pushed. PR creation returned GitHub API 403 Forbidden;
  ready-to-paste English description: `/tmp/c20-pr-description.md`. Open one PR
  from this branch for Claude review when API access is available; do not merge.

- 2026-10-22 08:41 WIB (Codex, C20 checkpoint): added translate/runAssist,
  strict two-key output with numeric/code/link preservation, English/Indonesian
  demo replays, reviewer/gate endpoint, hash/version/mode-aware ai_drafts cache
  with atomic metadata-only audit and same-process concurrent-call sharing.
  New EvidenceTranslation component displays the result below its original,
  full hashes, target selection, injection warning and manual fallback. Original
  evidence, rules and recommendation are untouched. 37 targeted tests and
  typecheck passed. Next: full tests/typecheck/build, browser check, documentation
  and one PR. No dependencies. C20 starts independently from current origin/main
  (b966c8d, merged C18); it does not include unmerged C19 changes.
- 2026-10-22 08:20 WIB (Codex, C19 Part A): implemented on
  `feat/c19-partial-refund` from main including merged C18 PR #56. Reviewer types
  a canonical two-decimal positive USD amount below the deal total and a reason.
  The partial-return checkbox defaults unchecked and is separate from full-refund
  return settings. Copilot ranges never fill the amount or enter payment logic;
  adopted reason metadata is preserved as unchanged/edited.
  UNDER_REVIEW partial decisions persist amount/reason/return choice and original
  decisionBasis/aiDraft metadata before payment. The staged orchestrator reserves
  the shared PAYPAL_CAPTURE request id, captures, then atomically saves capture id,
  COMPLETED and PARTIAL_REFUND_CAPTURED before reserving PAYPAL_PARTIAL_REFUND.
  A confirmed amount refund reaches final PARTIALLY_REFUNDED with refund id/audit.
  Failed/uncertain/interrupted calls are not resent by repeat requests or tick.
  Refund failure after capture stays COMPLETED with PAYPAL_ERROR, request/debug
  ids and a visible refund-pending notice. No reconciliation worker is added.
  Required returns reuse RETURN_REQUESTED/deadline/delivery; a missed return
  cancels the conditional partial refund, but tick cannot cancel a return already
  delivered. Existing captures are reused. A competing pending full money action
  blocks initial partial-decision storage inside the SQLite transaction.
  Existing-database migration widens the CHECK and adds partial-refund fields plus
  decision amount/return choice, preserving ids, rows, audit hashes and triggers.
  Simulated gateway and demo stub accept explicit amounts. UI has manual amount,
  pending notices on deal/review/receipt, new status/timeline and receipt amount;
  SPLIT remains recorded-only and is explained separately. Platform bears the fee
  on the refunded part; no seller payout or partial-fee deduction is implemented.
  README, DESIGN, UI status mapping and proposal status updated. Part B untouched;
  no accept-claim/make-offer calls and no new dependencies. APIMatic PayPal context
  tools unavailable; used existing PayPalClient.refundCapture amount support.
  `npm test` 435/435 (41 files), typecheck, build and diff check passed. Tests cover
  amount/role/gate checks, call ordering, errors after capture, uncertain results,
  concurrency/idempotency, returns/deadlines, migration, receipts, C18 metadata,
  simulated mode, tick not retrying and valid chains. Production Chromium with a
  fresh temp DB, simulated PayPal/replay: form, successful receipt and pending
  review at 390/1440px light/dark; manual amount, unchecked partial return, AI
  provenance, capture-before-refund and pending debug/request ids verified.
  A labelled fake-client failure fixture supplied the pending browser state.
  First browser pass caught nested-paragraph hydration errors in the new notice;
  changed its child text to spans. Final pass: no overflow or console errors/warnings.
  Real integrated Sandbox partial-refund execution remains pending; C20 not started.
  All work is committed and pushed. PR creation returned GitHub API 403 Forbidden;
  ready-to-paste English description: `/tmp/c19-pr-description.md`. Open one PR
  from this branch for Claude review when API access is available; do not merge.

- 2026-10-22 08:12 WIB (Codex, C19 checkpoint): Part A implemented locally:
  bounded USD reviewer amount, staged capture/refund with separate durable claims,
  partial decision storage/migration, required-return path, final PARTIALLY_REFUNDED,
  pending/error notice, receipt amount, manual UI amount and C18 audit provenance.
  Shared capture request id prevents a second capture across release/partial paths.
  42 targeted tests and typecheck passed before final compatibility refinements.
  C18 was merged by Claude (#56) and integrated before this commit. No Part B or
  new dependencies. APIMatic PayPal plugin is unavailable; existing PayPalClient
  already supports refund with amount. Next: full tests/typecheck/build, browser
  390/1440 light/dark, README/DESIGN/HANDOFF completion and one review PR.

- 2026-10-22 08:15 WIB (Claude): reviewed and merged C18 reviewer copilot (391 tests,
  build, browser check 390 light / 1440 dark). Watch in the live-model eval: the copilot
  validator rejects any capitalised word outside a short allow-list (name screening), so
  live drafts with words like "Battery" or "Courier" will come back "unavailable"; widen
  the list or switch to name masking if that happens.
- 2026-10-22 07:58 WIB (Codex, C18): reviewer copilot implemented and verified on
  `feat/c18-reviewer-copilot`. `runAssist` feature copilot / copilot-v1 drafts cited
  per-criterion notes, a 20-800 character reason, and optional bounded R5-only
  damage/incomplete refund ranges with a basis. Exact keys, known criteria/aliases,
  cite-or-drop, URL/name/certainty screening and currency bounds are unit tested.
  Proper-name screening is conservative, can reject harmless wording, and is not
  a general personal-data detector; synthetic data and human checking remain required.
  The recorded Smartwatch has no component valuation: its 0..64 USD range is clearly
  labelled as outer bounds rather than an estimate. No amount is selected or executed.
  Reviewer-only POST `/api/transactions/{id}/ai/copilot` applies the reviewer gate,
  empty-body/id/status checks and requires an existing recommendation. Both sides'
  evidence uses B1/S1 aliases (no internal ids); the quoted input includes locked
  terms, type and rule recommendation. Replay matches the exact labelled demo
  snapshot, avoiding reuse after edits. New copilotStore helper reuses ai_drafts
  without changing drafts.ts. Draft storage binds current terms/evidence hashes;
  stale generation/adoption is rejected. AI_DRAFT_CREATED logs metadata only.
  Review POST accepts copilotDraftId and records server-compared unchanged/edited
  aiDraft metadata in DECISION or the existing pending-split event. Human reason
  remains required, manual decisions have no AI attribution, and ranges never
  enter rules or PayPal parameters. Original recommendations and summaries are
  unchanged and shown first. Moved the review form into ReviewDecision, with a
  separate ReviewerCopilot component, explicit Use as reason, editable reason and
  restoration of pre-draft manual text. client.tsx shrank; evidence labels match B/S.
  `npm test` 391/391 (39 files), typecheck and build passed. Production Chromium,
  fresh temp DB, PAYPAL_MODE=simulated / AI_MODE=replay: 390/1440px light/dark,
  preview without autofill, apply/discard/edit, unchanged rules/summary, edited
  decision audit, display-only range, injection/unavailable fallback and a manual
  decision after failure. No overflow or console errors/warnings; audit chain verified.
  DESIGN 6.1 updated. No dependencies. Rules/transitions/PayPal calls/shared assist.ts
  unchanged; protected drafts*, OutboundDrafts.tsx and paypalDisputes.ts untouched.
  Live-provider verification and Claude review remain pending. C19 has not started.
  All work is committed and pushed. PR creation returned GitHub API 403 Forbidden;
  English body: `/tmp/c18-pr-description.md`. Open one PR from this branch for
  Claude review when API access is available; do not merge.

- 2026-10-22 07:55 WIB (Codex, C18 checkpoint): implemented copilot/runAssist,
  exact schema with citation dropping, bounded R5-only ranges, exact demo replay,
  separate server-side ai_drafts helper, reviewer-gated UNDER_REVIEW endpoint,
  metadata-only AI_DRAFT_CREATED and reason unchanged/edited decision audit.
  Added separate reviewer UI with explicit Use as reason and manual restoration;
  rules/summary remain first and unchanged. Terms/evidence changes invalidate a
  draft. 51 targeted tests passed; initial typecheck passed. Next: full npm test,
  typecheck, build, 390/1440px light/dark browser check, final documentation and PR.
  No dependencies, PayPal/rules/state-machine changes, or edits to protected files.

- 2026-10-22 07:45 WIB (Claude): checked every sponsor details page; plan in
  docs/SPONSOR-TOOLS.md (AG Studio main target, Render deploy + Workflows, APIMatic plugin
  optional, Bryntum backup, others skipped).
- 2026-10-22 07:32 WIB (Owner + Claude): sponsor tool decided: AG Studio dashboard (trial
  registered at build time), fallback AG Grid Community. Build after the feature work.
- 2026-10-22 07:25 WIB (Owner + Claude): hosting decided: Render (free first). AG Grid
  reviewer console + AI draft statistics still awaits the owner's yes/no.
- 2026-10-22 07:15 WIB (Owner + Claude): owner approved proposal A (partial refund decided
  by the reviewer: PARTIAL_REFUND state, capture then refund the amount, no return by
  default, reviewer sets the amount). B (PayPal accept-claim/make-offer) and the fee
  min/cap were not approved. Build A after C18 is merged (same files); this is a state
  machine change already approved, see docs/PROPOSAL-PARTIAL-REFUND.md.
- 2026-10-22 07:12 WIB (Claude): terms validator now allows two-decimal measurements with
  a unit (2.40 GHz, 85.50%, f/3.50) and still rejects prices (tests added); the Codex task
  fix/terms-validator-units is therefore done. README Problem section gains international
  examples (Facebook Marketplace, Kleinanzeigen, PayPal G&S on forums); owner re-reads
  before the demo.
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
