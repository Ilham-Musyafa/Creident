# About logo removal and info-page dock clearance — 2026-10-26

Baseline: ui/creident-mockup `a53d51a`. Layout-only change:

- Remove About's standalone BrandLogo card/import. No asset/component deletion;
  compact mobile header and persistent desktop sidebar branding remain.
- Keep title, intro, rules, limitations, anchors and 24px card styling unchanged.
- Below 1024px, InfoPageShell's .info-panel retains its 20px bottom inset plus
  env(safe-area-inset-bottom, 0px). AppShell's existing 128px dock reservation
  remains, as on Home/Records. The rule affects neither desktop nor other panels.

## Screenshots

- about-top-{light,dark}-390.png
- about-bottom-{light,dark}-390.png (last card initially closed)
- about-bottom-expanded-{light,dark}-390.png (final limitations bullet above dock)
- fairness-bottom-{light,dark}-390.png
- about-top-light-1440.png / about-bottom-light-1440.png
- fairness-bottom-light-1440.png

Actual Chromium viewport captures, height 844px, reduced motion, explicit themes,
production Node 22.23.4 server on local port 3232. Local labelled simulated fixture
only; no write/API/provider actions or owner credentials were used. A tall expanded
limitations card is naturally scrollable; its final bullet and lower border can
clear the dock, rather than requiring the whole tall card to fit one viewport.

## Verification

- npm test: 517 tests / 49 files passed. npm run typecheck and npm run build passed.
  git diff --check passed. No new dependencies or style-mirroring tests.
- browser-checks.json: 18 scenarios = 360/390/1440px x light/dark x three roles.
  No duplicate About logo card, visible header/sidebar wordmark, unchanged title/
  intro, no overflow/runtime errors. On mobile, Settings links reach #decisions
  and #limitations (24 link checks across the 12 mobile scenarios).
- At maximum scroll, last closed About card and Fairness notice are at least
  63px above the dock in the checked mobile viewports. With limitations expanded,
  the last bullet is at least 85px above the dock. Actual headless safe-area value
  is zero; the production CSS explicitly adds the device-provided inset.
- desktop-comparison.json: four matching-role Seller pairs, Fairness top/bottom
  at 1440px in light/dark, pixel-identical to baseline. About desktop changes only
  by removal of the requested logo card and the resulting upward content shift.

QA scripts: /tmp/creident-info-bottom-check.mjs,
creident-info-bottom-baseline.mjs and creident-info-bottom-desktop-after.mjs.
Raw desktop comparisons remain in /tmp/creident-info-bottom-before/.
No src/lib, API, rules, state, audit, data, copy or brand-asset changes.
