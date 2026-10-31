# UI audit polish — 2026-10-31

## Scope and branch

Three UI phases on `ui/audit-polish`, starting at `da61f89` after PR #137.
The owner explicitly allowed starting before documentation-only PR #136 merged.
After #136 merged, `origin/main` (`032aeac`) was merged into this branch (`26909b8`).
README was not edited; both existing HANDOFF entries were preserved.

No domain, API, database, payment, AI request, rules, deadline or hashing implementation was changed.
Demo fixtures and browser-created deals live only in an isolated local test database.

## Audit checklist

| Item | Result |
| --- | --- |
| 1 | Done: neutral saved-snapshot note and plain Needs a reviewer label; no key read or printed. |
| 2 | Done: Settings On this page navigation and its unused constant removed; sections unchanged. |
| 3 | Already fixed in #137: retained behavior; added seller/status and non-seller regression tests, including created=1. |
| 4 | Done: deadline queue uses displayItemName; stored item/event data unchanged. |
| 5 | Done: Demo markers join checkout/evidence/review headers; checkout uses the shell content width. |
| 6 | Done: item name appears once as the deal page title. |
| 7 | Not present in the supplied task numbering; no extra scope invented. |
| 8 | Done: one review-page Technical details; original/translation interaction and all hashes remain available. |
| 9 | Done: compact Fairness notice, complete original facts and disclosure retained. |
| 10 | Done: compact mobile rows show icon, title, category/date, visible Demo marker, status, amount and chevron. Home priority ordering retained; Transactions follows the owner's pinned/date clarification. |

## Phase 3 and owner clarification

- Transactions: filters/search apply first. Needs your action is pinned regardless of age, nearest deadline first. Remaining rows use latest stored event time, grouped Today / This week / Earlier, newest first. Completed/cancelled stay in date groups. Empty sections are hidden and no row repeats.
- Home: no date headings; actions, active, then closed/cancelled, newest updated first within each. The single next-step card uses the nearest actionable deadline.
- UTC calendar days and a Monday-start week match the existing UTC date presentation. No dates or deadlines are rewritten.
- Status icons cover all 15 statuses. Existing text, tones and desktop 160px width stay intact; abbreviated labels retain full accessible text and title.
- Mobile Home has three round role shortcuts, neutral counts and the existing whole-card next-step link. Dock implementation is untouched: Seller retains its centre New deal button; other roles retain their existing dock.
- Deal detail keeps one actual action UI. Hero and sticky links target that same #next-step form instead of duplicating an action request. Waiting roles have no sticky action. Desktop uses the amber action card in the aside; mobile retains vertical progress and Current step text.
- Four condition options use native required radio inputs. Their labels and saved strings are unchanged; stable accessible names, keyboard selection and visible focus are retained. USD prefix is decorative; decimal input and validation are unchanged.
- CSS-only card entry is 220ms, count-up is 600ms once, press feedback is 0.98. Reduced motion makes these immediate. No fake delays or loading placeholders were added.

## Before / after

Before images were captured from the starting UI at 390px and 1280px in light mode for representative roles.
The after set covers all ten pages, three roles, 390/1280/2560px, light and dark (180 screenshots).
The deal matrix uses Seller/approved, Buyer/inspection and Reviewer/under-review examples.
Existing role gates remain visible on pages a role cannot use.

| Page | Before 390 | After 390 | Before 1280 | After 1280 | Change |
| --- | --- | --- | --- | --- | --- |
| home | [Before](before-home-seller-390-light.png) | [After](after-home-seller-390-light.png) | [Before](before-home-seller-1280-light.png) | [After](after-home-seller-1280-light.png) | Neutral action count, round role shortcuts; priority ordering, one next-step link. |
| transactions | [Before](before-transactions-seller-390-light.png) | [After](after-transactions-seller-390-light.png) | [Before](before-transactions-seller-1280-light.png) | [After](after-transactions-seller-1280-light.png) | Pinned actions, then Today / This week / Earlier; segmented existing filters and compact rows. |
| deal | [Before](before-deal-seller-390-light.png) | [After](after-deal-seller-390-light.png) | [Before](before-deal-seller-1280-light.png) | [After](after-deal-seller-1280-light.png) | Item title once; mobile centred hero, single action form and sticky anchor; desktop action aside and horizontal progress. |
| checkout | [Before](before-checkout-buyer-390-light.png) | [After](after-checkout-buyer-390-light.png) | [Before](before-checkout-buyer-1280-light.png) | [After](after-checkout-buyer-1280-light.png) | Demo pill moved into the header; full-width checkout container. |
| evidence | [Before](before-evidence-buyer-390-light.png) | [After](after-evidence-buyer-390-light.png) | [Before](before-evidence-buyer-1280-light.png) | [After](after-evidence-buyer-1280-light.png) | Demo pill joins the header status instead of floating below it. |
| review | [Before](before-review-reviewer-390-light.png) | [After](after-review-reviewer-390-light.png) | [Before](before-review-reviewer-1280-light.png) | [After](after-review-reviewer-1280-light.png) | Header Demo pill; one page-level technical disclosure with original and translation hashes. |
| settings | [Before](before-settings-seller-390-light.png) | [After](after-settings-seller-390-light.png) | [Before](before-settings-seller-1280-light.png) | [After](after-settings-seller-1280-light.png) | Removed the redundant On this page navigation; all section cards and ids retained. |
| fairness | [Before](before-fairness-seller-390-light.png) | [After](after-fairness-seller-390-light.png) | [Before](before-fairness-seller-1280-light.png) | [After](after-fairness-seller-1280-light.png) | Tighter recorded-answer caveat; copy, values and What this means disclosure retained. |
| oversight | [Before](before-oversight-reviewer-390-light.png) | [After](after-oversight-reviewer-390-light.png) | [Before](before-oversight-reviewer-1280-light.png) | [After](after-oversight-reviewer-1280-light.png) | Neutral saved-snapshot note, readable recommendation label and display-only demo-prefix removal. |
| new-deal | [Before](before-new-deal-seller-390-light.png) | [After](after-new-deal-seller-390-light.png) | [Before](before-new-deal-seller-1280-light.png) | [After](after-new-deal-seller-1280-light.png) | Four condition radio chips, USD prefix and required-field markers; same submitted terms. |

Dark and wide images use `after-{page}-{role}-{width}-{theme}.png`.
Additional interaction images show the created deal and the expanded review Technical details.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 662 tests in 66 files passed. New coverage: share visibility, Home priority, pinned/date grouping, deadline ordering, UTC boundaries, cancellation grouping, icon coverage and full accessible status labels, compact row ordering. Condition form assertions now cover the four required radios and unchanged values.
- `npm run build`: passed (Next.js production build).
- Playwright production UI in simulated PayPal / replay AI mode: 180 views checked; no console warnings/errors, page errors or horizontal overflow in the completed run.
- All five filter buttons checked at 390/1280/2560 for all roles: pressed state and URL updates work, no duplicate rows. Visible desktop pills remain 160px without truncation.
- Deal checks at the same widths/roles: one actual #next-step UI, correct mobile/desktop order, sticky link above the dock, no POST when using its anchor.
- Join dialog at 390/1280: invalid reference message, Escape/focus return, and valid other-domain reference safely opening the internal checkout route.
- Replay terms draft applied successfully; all four condition chips selected. A real new deal preserved the final selected condition, category/subcategory and price. Existing decimal keyboard attribute retained.
- Real evidence translation worked; source and translation hashes were reachable in the single page-level disclosure, and original evidence remained visible.
- Home CSS counter reaches the stored count in normal and reduced-motion modes; reduced motion disables count-up. Main mobile controls checked for >=44px targets, including filters, round shortcuts, condition labels, disclosure summaries and sticky action.
- `git diff --check`: passed. No dependencies added. No deployment performed.

The initial screenshot run was interrupted when a local rebuild replaced the running server's assets. The server was restarted from the final build and the complete matrix rerun; the reported result is that clean final run.

## Review choices / limits

- Existing role-specific Home visibility and demo markers were preserved. No new Drafts filter, Edit-while-Draft change or role access behavior was introduced.
- Before screenshots are representative light-mode baselines, not a complete before matrix. After screenshots cover the full requested matrix.
- Real PayPal Sandbox and live-model calls were not run: verification intentionally used simulated PayPal and recorded AI answers.
- No additional owner decision is required. UTC/Monday grouping and reusing one action form are documented presentation choices.
