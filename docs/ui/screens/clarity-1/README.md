# Clarity phase 1 — before / after

Phase 1 only, from origin/main `7c61ec1` (PR #135 merged). Phase 2 has not started.

## Page changes

| Page | Before | After | Comparison |
| --- | --- | --- | --- |
| Deal | `created=1` could keep the seller share card visible after payment approval; technical values had a bare disclosure heading. | Share card depends only on DRAFT / TERMS_LOCKED / AWAITING_APPROVAL and Seller. Technical disclosure has a bordered row and chevron. | [Before](before-deal-seller-1280-light.png) · [After](after-deal-seller-1280-light.png) |
| Add evidence | Code hidden in Technical details; guidance, form, chat note and optional AI check scattered; equal columns. | Three numbered steps: What to include, Write your evidence, optional Check with AI. Plain code + Copy, larger textarea, example/count, Submit below the field; deadline/shared evidence list/back link in the right column, stacked on mobile. | [Before](before-evidence-buyer-1280-light.png) · [After](after-evidence-buyer-1280-light.png) |
| Problem review | Three narrow buttons on mobile; long desktop label wrapped to three lines. | Mobile stacks three equal-height 56px buttons. Desktop uses a weighted single row with equal 64.5px heights; long label fits two lines. Existing labels, outcomes and confirmation actions are unchanged. Shared technical disclosures use the bordered row. | [Before](before-review-reviewer-1280-light.png) · [After](after-review-reviewer-1280-light.png) |
| Decision receipt | Bare technical heading. | Same content/order; shared bordered technical row and rotating chevron. | [Before](before-decision-buyer-1280-light.png) · [After](after-decision-buyer-1280-light.png) |
| Review & pay | Bare technical heading. | Same content/order; shared technical row. | [Before](before-checkout-buyer-1280-light.png) · [After](after-checkout-buyer-1280-light.png) |
| Demo PayPal approval | Bare technical heading. | Same content/order; shared technical row. | [Before](before-approval-buyer-1280-light.png) · [After](after-approval-buyer-1280-light.png) |
| Fairness | Bare bottom technical heading. | Same text, results and layout; shared technical row. Inline technical values in already-open case steps remain inline. | [Before](before-fairness-seller-1280-light.png) · [After](after-fairness-seller-1280-light.png) |
| About | Bare technical headings inside the existing sections. | Same copy and layout; shared technical row. Parent disclosures are opened in QA to inspect the nested technical row. | [Before](before-about-seller-1280-light.png) · [After](after-about-seller-1280-light.png) |
| History check explainer | Bare technical heading. | Same text/order; shared technical row. The per-deal history timeline and its inline values are unchanged. | [Before](before-history-checks-seller-1280-light.png) · [After](after-history-checks-seller-1280-light.png) |

## New or adjusted labels

- Numbered step headings: “What to include”, “Write your evidence”, “Check with AI”; “Optional” chip.
- Copy control/status: “Copy”, “Copy evidence code”, “Code copied”, “Select and copy the code above.”
- Text examples under the textarea: “Example: The photo shows a crack beside the evidence code.” / “Example: The seller said the charger was included.” / “Example: The left earbud does not charge.”
- Character counter: “N / 4000 characters”. The existing limit and whitespace-disabled Submit behaviour are unchanged.
- Right column: “Your evidence so far”, “Evidence deadline”, “Nothing submitted yet”, “Back to deal”. The existing shared list is retained with Buyer/Seller labels; it is not filtered or hidden.
- Removed the instruction to open Technical details to find the evidence code. Existing code/photo guidance is shown together with the unchanged text-only/no-upload note.
- The existing pasted-chat/quoted-text/human-review note is moved immediately above the textarea. Existing AI advisory wording is unchanged.
- Reviewer outcome labels and every status/category label are unchanged. No measured results or scope statements changed.

## Verification

- Typecheck, 640 tests / 61 files and production build passed. Four new presentation tests cover Buyer/Seller step order, code, validation/disabled state, empty list, urgency, Reviewer read-only access and the closed-window gate.
- Two existing security/copy assertions were updated for the label span and aria-hidden chevron markup; their raw-code containment and closed-disclosure checks remain.
- 162 final production Playwright views: nine pages × 390/1280/2560px × Seller/Buyer/Reviewer × light/dark. Representative before captures are included, plus mobile before images for Deal/Evidence/Review.
- Checked bordered 44px+ disclosure summaries, no hidden-content gap when closed, keyboard open/close and chevron rotation. Existing inline technical sections inside open history/case steps were not turned into nested disclosures.
- Checked Copy against clipboard content; blank/whitespace evidence stays disabled; textarea remains required with maxLength 4000; examples/count update, Reviewer cannot submit, and Submit scrolls above the dock.
- Reviewer buttons have equal measured heights, a single desktop row / mobile stack and no label over two lines. Local overrides are necessary because the shared minimum height and inherited font otherwise win the utility cascade.
- Submitted photo/chat/note evidence through the UI as Buyer/Seller; request payloads, persisted content and SHA-256 hashes match. Form clear/count reset and the existing automatic transition to review after both sides submit still work.
- AI check still uses the existing endpoint, has its existing one-run gate and becomes available after a new own evidence item. Confirmation Cancel works without submitting a reviewer decision.
- Seller share visibility checked against available seeded states and a TERMS_LOCKED fixture, including `created=1`; Buyer/Reviewer never get the seller card. The disputed-state gate was checked before evidence submission, plus 11 status samples after it.
- No horizontal overflow or normal browser console errors/warnings. `submit-visible-*` images show viewport-level dock clearance; `evidence-submitted-*` show the retained shared list and expanded hash values.

All QA data is isolated under /tmp, in simulated payment / replay AI mode. No database schema, API, stored production data, state machine, rules, deadlines, hashing or AI/payment logic changed. No dependency was added. Phase 2 remains pending the phase-1 PR handoff.
