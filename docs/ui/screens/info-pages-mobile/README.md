# Mobile info pages — 2026-10-26

Baseline: `ui/creident-mockup` at `3d98b87` (still unmerged). This pass fixes
mobile geometry only; copy, evaluation data and domain/API behavior are unchanged.

## Screenshot guide

Names follow `{before,after}-{page}-{role}-{theme}-{width}.png`.

- About top, About decisions, About limitations and Fairness: Buyer 390px,
  both themes, before/after. Anchor views keep native disclosures closed.
- Home and Settings: Buyer 390px, both themes, before/after (pixel-identical).
- About and Fairness: Buyer 1440px, both themes, before/after (pixel-identical).
- Oversight: Reviewer 390px and 1440px, both themes, before/after. Only mobile
  outer padding changes; Studio content and reviewer gates are retained.
- Additional after About/Fairness Buyer 360px views show the narrower layout.

All screenshots use Chromium, reduced motion and explicit theme, at viewport height
900px. Local simulated PayPal, replay AI, synthetic 13-deal SQLite fixture; Node
22.23.4 production build. A disposable local reviewer-code fixture was used. No
provider keys, owner access code or real payments were used. QA clock fixed to
2026-10-26T13:00:00Z in server/browser for deterministic Home/oversight comparisons.
AG Studio is allowed to load before capture; existing evaluation mode is retained.
Raw extra role/360px captures are retained under /tmp/creident-info-extra-screens,
not duplicated in the repository.

## Evidence

- before-matrix.json / after-matrix.json: 60 views each: 360/390/1440px x
  Buyer/Reviewer x light/dark x Home/Settings/About/Fairness/Oversight. Text digests,
  main geometry and browser exceptions retained; no after overflow or page errors.
- comparisons.json: 36 raster comparisons with exact hashes and pixel counts.
  All 16 Home/Settings mobile comparisons are pixel-identical. All 12 desktop
  About/Fairness/Oversight and all 4 desktop Home comparisons are identical.
  Desktop Settings has three tiny rounded-border raster exceptions: Buyer dark
  23 pixels, Reviewer light 2 pixels, Reviewer dark 5 pixels; maximum channel
  difference 1/255. No text/layout difference. Do not describe those as identical.
- interactions.json: eight 360/390px role/theme scenarios; Settings links reach
  #decisions/#limitations, Back returns /menu, 56 native rule keyboard toggles,
  focus-visible and 44px summaries, limitations/caveat expansion, exact existing
  visible copy and 24px radius/16px padding/20px outer inset. End-of-document
  limitations anchors stop lower in the viewport when scroll range ends; visible
  above the dock. Includes Seller and code-locked Reviewer smoke.
- accessibility.json: 642 text/contrast probes over both pages, both themes, all
  three roles with disclosures expanded: no failures. Body >=14px; rule chips
  and the prescribed brand tagline >=12px. Token contrast checked against actual
  composed card/notice backgrounds, including warning tones.
- regression.json: Transactions, New deal, Records and verification explainer
  at 390px dark across all three roles: 12 valid responses without overflow.

Gates: npm test 497 passed / 48 files; npm run typecheck passed;
npm run build passed; git diff --check passed. No new dependencies/tests required
for presentation-only changes. Browser scripts: /tmp/creident-info-captures.mjs,
creident-info-interactions.mjs, creident-info-contrast.mjs and
creident-info-regression.mjs. Local before/after ports were 3227/3228.

## Affected route inventory

The previous implicit zero-padding rule affected Home `/` and every Menu-active
route: `/menu`, `/about` (including #decisions/#limitations), `/fairness` and
`/reviewer/oversight` (including Buyer/Seller and locked-Reviewer notices).
Home/Settings now opt in explicitly and keep their existing full-bleed composition.
About/Fairness opt in through InfoPageShell, which owns the mobile header and inset
panel. Oversight uses ordinary AppShell padding. No other Menu-active pages exist.
Transactions and Records already pass mobileFullBleed; all other AppShell pages
keep their original default padding.
