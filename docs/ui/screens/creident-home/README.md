# Mobile Creident Home refinement — 2026-10-26

## References and scope

The owner first supplied generic finance inspiration, then the actual approved
Creident concept sheet with light/dark Home and close-up inner-page references.
See ../../reference/creident-mockup/. This is a Creident implementation of that
header/tiles/inline task/compact row hierarchy, using actual data, no example
values, identities, claims, charts or hashes. Inner-page layouts are future scope.

Only mobile shared presentation and Home changed. No API, payment, state machine,
rule, deadline, audit or data model changes. No new dependencies/font requests.

## Captures

- home-{buyer,seller,reviewer}-{light,dark}-390.png: 390 x 844 viewports.
- Corresponding -full.png: expanded capture height places the fixed dock below all
  page content. These are full content views, not phone viewport size claims.
- home-buyer-light-1440.png: unchanged desktop Home.
- transactions/records/settings-{light,dark}-390.png and -full.png: shared-primitives
  regression views; each page retains its existing content layout/controls.
- failed-{light,dark}-390-full.png: isolated synthetic fixture with one invalid chain.
  Home shows alert plus 12 of 13 verified, never an all-verified label.
- empty-actions-light-390.png: existing no-transactions/no-actions behavior.

All captures use actual application demo fixtures (13 deals), not values from design
images. Reviewer currently has one queue row; no placeholder rows were added.
Node 22.23.4, production build, Chromium, reduced motion, explicit theme, local
simulated payments and recorded AI replays. A synthetic local reviewer code was
configured for testing. No production/provider credentials were used or captured.

## Evidence

- desktop-comparison.json: pixel comparison of all 24 before/after desktop captures
  (Home, Transactions, Records, Settings x three roles x two themes) at 1440px,
  baseline origin/main 9a1acd1. All identical. Full SHA-256 values are recorded.
- page-matrix.json / browser-checks.json: browser role/theme/viewport and interaction
  results, actual main-action targets, console errors and unintended write tracking.
- accessibility-checks.json: 416 visible Home text checks, normal/failed datasets,
  three roles, both themes; no sub-12px text or contrast failures. Gradient checks
  use a conservative endpoint; decorative waves were also visually inspected.
  Configured reviewer API gate rejects missing code and accepts the local test code.

Required gates: npm test (497 passed, 48 files), npm run typecheck, npm run build,
and git diff --check passed. These are main's tests; the separate, unmerged
security/demo-audit branch is not stacked into this UI task.

Known reference adaptations: AA dark text on Sapphire buttons/navigation;
readable 14px body/12px meta and 44px targets even when long real labels extend
below the fold; no fake Export/search/photo or banking features;
no fake dates for rows whose existing Home presentation data has no date/deadline;
no fabricated reviewer tasks; dark mode follows Creident's established tokens.

## Follow-up: visible Demo markers and role-relevant deals

The Home screenshots were refreshed after `0d05032` on 2026-10-26. Every compact
simulated/demo row shows a visible 12px Demo badge in light and dark. Buyer and
Seller lists use their stored demo party IDs; Reviewer uses UNDER_REVIEW only.
Needs-action precedes active, then repository recency. Main actions are unchanged.
These are demo identities, not authenticated account ownership.

- home-fixes-after.json: 12 production browser views (390/1440, three roles, two
  themes), actual rows/actions, no overflow or runtime exceptions.
- home-fixes-selection.json: six role/theme checks against the actual QA fixture,
  including DRAFT acceptances; unchanged Buyer Inspect now, Seller Add evidence,
  Reviewer Review now. Lists contain three / three / one rows respectively.
- home-fixes-desktop-comparison.json: all six Home desktop pairs pixel-identical
  to `0d05032`. The 1440px screenshots now show the existing persistent sidebar.
  Earlier desktop-comparison.json remains historical evidence for the initial
  mobile refinement, before that sidebar task.

Required gates: 497 tests in 48 files, typecheck and production build passed.
QA used the same local 13-deal fixture and fixed clock as the shell checks.
