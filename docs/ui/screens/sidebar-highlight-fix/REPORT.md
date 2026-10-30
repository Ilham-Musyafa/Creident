# C35 — Sidebar and mobile navigation highlight

Date: 2026-10-30. Base: `origin/main` at `e60078e` (merged PR #98).

## Change

- `DesktopNavigation.tsx`: `/how-it-works` and `/reviewer/oversight` now explicitly select no primary sidebar item. The fallback distinguishes an explicit `null` from an unknown route so Settings does not light up again. The How it works Learn highlight remains.
- `InfoPageShell.tsx`: its info pages no longer select Settings in the mobile dock. About and Fairness now match their desktop behavior.
- `reviewer/oversight/page.tsx`: Review desk no longer selects Settings in the mobile dock.
- No route labels, copy, spacing, business behavior, tests, or other page highlights changed.

## Verification

- `npx tsc --noEmit`: passed.
- `npm test`: 549 tests passed in 53 files. No existing test covered `pageInfo` or the navigation active state, so no test was changed.
- `npm run build`: passed.
- Production Chromium at 390px and 1440px, light and dark: `/how-it-works`, `/about`, `/fairness`, `/menu`, `/deals`, `/audit`, `/reviewer/oversight`. Before: 16 screenshots covering the affected info routes. After: 28 screenshots covering all seven routes. All requests returned 200; no browser console errors or warnings, page exceptions, or horizontal overflow. Review desk was checked in its seller gate view; navigation selection does not depend on the demo role.
- After: desktop How it works has only its Learn item active; About and Fairness have only their Learn item active; Menu, Deals, and Audit have their corresponding primary item active; Review desk has none. Mobile info pages and Review desk have none; Menu, Deals, and Audit have their corresponding dock item active.

`docs/HANDOFF.md` was left unchanged as requested. Suggested handoff entry for the lead: “2026-10-30 — C35 fixed duplicate desktop Settings highlight on How it works and removed the incorrect Settings highlight from Review desk and mobile info pages. Learn highlighting and other page navigation remain. Typecheck, 549 tests, build, and 390/1440px light/dark browser checks passed.”
