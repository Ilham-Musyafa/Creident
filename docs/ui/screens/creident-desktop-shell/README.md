# Persistent desktop shell — 2026-10-26

## Scope / branch

Mobile Home was finished at `94b24d9`. That design branch is still unmerged,
so this related task continues `ui/creident-mockup` from **94b24d9**. No main push,
merge or deployment. Reference PNGs are archived in ../../reference/creident-mockup/desktop/.
This pass implements sidebar/top bar/container only. Existing Home, Transactions,
Records and Settings bodies remain; body headings have not been consolidated.

## Files

- src/components/layout.tsx: request-role-aware AppShell, skip target, main wrapper.
- src/components/DesktopNavigation.tsx: persistent primary/Learn nav, route titles,
  existing appearance popover, role card and actual payment-mode notice.
- src/components/QuickRoleSwitch.tsx: sidebar appearance/above-card positioning;
  focus restoration ignores hidden triggers. Existing cookie/gates/actions preserved.
- src/components/TransactionsBrowser.tsx: portals the original controlled desktop
  search into the Transactions top bar. Existing query/filter/result behavior remains.
- src/components/layoutPrimitives.tsx: unchanged presentational primitives extracted
  for client imports. Nine consumer import paths updated; page-body markup unchanged.
- src/components/ui.tsx: exposes existing NavIcon for reuse; mobile markup unchanged.
- src/app/globals.css: token-based desktop geometry/colours/focus and 12-column helper.
- src/app/api/routes.test.ts and partialRefund.test.ts: legacy synchronous receipt
  renderers mock only the new async shell wrapper. All receipt and payment assertions
  remain intact. Actual request/cookie shell is covered by production browser checks.
- docs/UI.md, docs/HANDOFF.md and reference/capture documentation.

## Captures

- home-buyer-light-1440.png / home-buyer-dark-1440.png.
- transactions-buyer-light-1440.png / records-buyer-light-1440.png.
- home-buyer-{light,dark}-{1280,1024}.png.
- home-seller-light-1440.png / home-reviewer-light-1440.png.
- home-buyer-light-390.png: unchanged mobile Home.

Desktop full-page captures retain the fixed sidebar at the viewport's height (900px).
It stays in place when the document scrolls; the sidebar can scroll on short screens.
These are synthetic application demo facts, not mockup data. No real provider/code
credentials were used. The reviewer code in QA was a disposable local fixture.

## Verification

- Node 22.23.4; npm test **497 passed / 48 files**; typecheck/build/diff check passed.
- page-matrix.json: **408** page views, 17 routes x three roles x two themes x
  four widths (1440/1280/1024/390); no horizontal overflow or runtime exceptions.
  The deliberately incomplete PayPal callback shows its existing invalid-ID error
  and expected API 400; no payment is approved or changed by that probe.
- interactions.json: **18** desktop role/theme/width scenarios check search/results/
  filters, role switch focus and URL preservation, role menu placement, appearance
  Light/Dark/System persistence, Learn destinations/current states, fixed sidebar,
  keyboard targets/focus and skip link. Reviewer API remains 403 without code,
  200 with the configured synthetic code. No auth or API behavior was changed.
- accessibility.json: **126** visible shell text checks; no small text/contrast failures.
- mobile-comparison.json: 102 before/after page/role/theme comparisons against
  `94b24d9`, using the same synthetic DB and a fixed clock in QA only. Home,
  Transactions, Records, Settings and the other stable views are pixel-identical.
  Reviewer oversight grids are captured only after all widgets are loaded at expanded
  height; the callback after its error resolves. The raw comparison records one
  **100/102 raw pairs are pixel-identical**. The About buyer-dark rounded border
  differs in 182 pixels and callback seller-light border in 58 pixels, both at a
  maximum of 2 RGB levels with matching dimensions/text/layout. These tiny raster
  differences are not silently marked pixel-identical. No mobile layout/content/font/nav styles were redesigned.

## Deliberate reference adaptations / limits

- No global search: existing item search appears only on Transactions.
- Optional Transactions badge omitted: AppShell has no shared action count and this
  task adds no count query or fake number.
- Navigation/action text uses AA dark colour on Sapphire. Role switching is still
  demo navigation with the existing reviewer code, not real sign-in.
- Existing page bodies (including headings and dashboard composition) are retained.
  The mockup's new cards/tables, example values and new controls are future scope.

No payment/PayPal/domain/state/rule/deadline/audit/API/data-model/dependency change.
No owner decision is pending for this shell.
