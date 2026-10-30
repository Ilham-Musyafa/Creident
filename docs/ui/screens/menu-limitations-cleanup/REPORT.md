# C34 — Remove duplicate Limitations menu entries

Date: 2026-10-30. Base: `origin/main` at `d35cc4f` (merged PR #96).

Removed the `/about#limitations` destination from the desktop Settings list, the mobile Settings list, and the desktop Learn sidebar. The `limits` icon and its now-unreachable sidebar selection branch were removed. The mobile and desktop Home footer links and the About section with `id="limitations"` were unchanged. No test assertions needed updating.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 549 tests passed in 53 files.
- `npm run build`: passed.
- Production Chromium: `/menu` and Home at 390px and 1440px, light and dark. Visible menu links to `/about#limitations`: before 1 (mobile) / 2 (desktop), after 0. Each Home footer still exposes one visible link. Clicking it opened `/about#limitations` and scrolled the section into view in all four combinations. No horizontal overflow, browser console errors or warnings, or page exceptions were observed.
- Screenshots are in `before/` and `after/`: `menu`, `home`, and `about-limitations` for both widths and themes (24 PNGs total).

`docs/HANDOFF.md` was left unchanged as requested. Suggested handoff entry for the lead: “2026-10-30 — C34 removed duplicate Limitations links from mobile Settings, desktop Settings, and desktop Learn. Home footer links and `/about#limitations` remain. Typecheck, 549 tests, build, and 390/1440px light/dark browser checks passed.”
