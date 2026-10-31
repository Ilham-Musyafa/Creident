# Second-audit UI fixes — 2026-10-31

Branch: `ui/audit-fixes-2`, based on `ec59724` (main after PR #138).
Scope: presentation only; no domain, API, data, rules, hash, payment or dependency changes.

## Changes and decisions

1. **Deal actions** (`src/app/deals/[id]/page.tsx`, `src/components/client.tsx`, `src/app/globals.css`): the actual primary link/button is fixed above the dock on mobile and remains in the next-step card on desktop. The separate duplicate sticky anchor is removed (except the existing awaiting-approval instruction link, which has no form button). Thus there are two mobile primary controls: hero shortcut and actual sticky control. Shipping/return inputs, the dispute wizard, errors and confirmation behavior are preserved; their supporting controls are not copies of the primary action. The mobile next-step card includes explanation/deadline text. Waiting roles have no hero action strip, including no lone history shortcut. The ordinary history links remain reachable elsewhere.
2. **Mobile Transactions** (`TransactionFilters.tsx`, `MobileTransactionRow.tsx`, CSS): the existing five filters use a single horizontally scrolling strip. On load/selection, only that strip scrolls to reveal the active chip; focus and the page scroll position are preserved. Unseen chips continue beyond the right edge. Subtitles keep the date without the year, truncate only the category when needed, and stay on one line. Titles use two lines maximum with their full title available. Per-row Demo text is removed as explicitly requested; the existing header Demo badge remains. Home shares the same row renderer and therefore receives the same subtitle treatment. Pinned/date grouping is unchanged.
3. **Desktop progress** (`ui.tsx`, `timelinePresentation.ts`): short titles under nodes, one full-width current-step description, other descriptions in title/accessible labels. Only the approval node uses the short Payment approved title; its full wording remains in descriptions. The mobile vertical timeline and nonresponsive timeline retain their full copy.
4. **Optional form polish** (`NewDealForm.tsx`): after the first three fixes passed browser checks, added a readable Fields marked * are required hint and a separate decorative USD prefix box. Native validation, decimal keyboard, values and submit behavior remain unchanged.

## Before / after

Before screenshots are from the merged #138 UI: 390/1280, light/dark, all three roles with/without a deal action, plus Seller Transactions/New deal (32 views).
The final after set includes those views, Buyer/Seller evidence actions and extra Buyer/Reviewer list/form gate views (56 views).

| View | Before 390 light | After 390 light | Before 1280 light | After 1280 light |
| --- | --- | --- | --- | --- |
| Seller with action | [Before](before-seller-action-390-light.png) | [After](after-seller-action-390-light.png) | [Before](before-seller-action-1280-light.png) | [After](after-seller-action-1280-light.png) |
| Buyer with action | [Before](before-buyer-action-390-light.png) | [After](after-buyer-action-390-light.png) | [Before](before-buyer-action-1280-light.png) | [After](after-buyer-action-1280-light.png) |
| Reviewer with action | [Before](before-reviewer-action-390-light.png) | [After](after-reviewer-action-390-light.png) | [Before](before-reviewer-action-1280-light.png) | [After](after-reviewer-action-1280-light.png) |
| Seller waiting | [Before](before-seller-wait-390-light.png) | [After](after-seller-wait-390-light.png) | [Before](before-seller-wait-1280-light.png) | [After](after-seller-wait-1280-light.png) |
| Buyer waiting | [Before](before-buyer-wait-390-light.png) | [After](after-buyer-wait-390-light.png) | [Before](before-buyer-wait-1280-light.png) | [After](after-buyer-wait-1280-light.png) |
| Reviewer waiting | [Before](before-reviewer-wait-390-light.png) | [After](after-reviewer-wait-390-light.png) | [Before](before-reviewer-wait-1280-light.png) | [After](after-reviewer-wait-1280-light.png) |
| Transactions | [Before](before-transactions-390-light.png) | [After](after-transactions-390-light.png) | [Before](before-transactions-1280-light.png) | [After](after-transactions-1280-light.png) |
| New deal | [Before](before-new-deal-390-light.png) | [After](after-new-deal-390-light.png) | [Before](before-new-deal-1280-light.png) | [After](after-new-deal-1280-light.png) |

Each view also has a `-dark.png` counterpart. Additional `after-buyer-evidence`, `after-seller-evidence`, `after-transactions-{buyer,reviewer}` and `after-new-deal-{buyer,reviewer}` images cover the other states.

## Checks

- `npm run typecheck`: passed.
- `npm test`: **676 tests / 67 files passed** (14 more tests than main).
- `npm run build`: passed.
- Regression coverage: role/status action visibility and one actual primary control; mobile short date/title/subtitle presentation; unchanged grouping tests; desktop node/full-copy presentation; no empty current description on completed timelines; separate price prefix and unchanged native validation/keyboard attributes.
- Playwright production build, simulated PayPal and replay AI, isolated local database: 56 final views, no console errors/warnings, page errors or horizontal overflow.
- Primary count/position checks across roles with/without actions; desktop card button retained; sticky/hero targets do not overlap the dock. Fourteen changed/main mobile controls checked at >=44px in both dimensions. The final deal card scrolls completely above the sticky control/dock because bottom clearance is retained.
- All five filter selections were opened directly in the URL at 390px: active chips fully visible, one row, keyboard focus works, and the first filter view shows a continuation of the strip. Date subtitles have one line and no per-row Demo/year.
- Real form interaction: created a synthetic deal through the UI, approved a simulated payment, then used the actual sticky Add tracking button. It submitted the selected tracking exactly once. No seeded/Render data was edited.
- Existing Confirm receipt sheet opens from the sticky button; Cancel makes no confirmation/payment request. Sticky Add evidence reaches the existing evidence route.
- The visible required hint fits at 390px; the prefix does not overlap the input; decimal input attribute remains intact.
- No dependencies added, deployment or real Sandbox/live-model run. No owner decision is needed.
