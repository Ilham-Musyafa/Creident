# Deal detail story — 2026-10-26

Baseline: unmerged ui/creident-mockup at `70f2f67`. This pass changes the detail
page composition and presentation only. No lib, API, payment, state-machine,
nextAction/timelineFor, deadline, audit or evidence-hash implementation changed.

## Before / after

| Before | After |
| --- | --- |
| Deal ID as heading, item beneath it | Item heading, small ID subtitle, then summary card with real amount/status/deadline/demo notice |
| Duplicate Next banner and real action in aside | One #next-step card immediately under summary, containing the original action component or role-relevant waiting text |
| Decision receipt link only | Recorded Decision card, bounded reason preview, existing receipt agreement wording and one receipt link |
| Timeline and activity before actual action | Progress and Activity after action/Decision; current step has visible text plus aria-current |
| Empty ActivityFeed disappears | Activity region/link remains with No activity yet |
| Terms in main, actions/fees/case tools in aside | Terms, fees, case tools, courier claim, share link when applicable and record link last/in the desktop aside |
| Different card scales | 24px radius, 16px content insets at both widths, scoped to .deal-story |

Locked terms/fees are one responsive native disclosure each, closed initially on
mobile and open on desktop. No duplicate content/IDs. Short desktop asides stick;
ResizeObserver disables sticking if the content is taller than available height.
The existing confirm-receipt, payment, review and PayPal-escalation confirmations
remain; no new confirmation dialog or AI replay marker was introduced.

## Normal next-step table

Exactly one next-step card/branch per page. The inspection branch deliberately
contains the existing confirm-versus-dispute choices, not two copies of either.
Secondary PayPal/courier controls remain available separately as requested.

| Status | Buyer | Seller | Reviewer |
| --- | --- | --- | --- |
| DRAFT | Review terms & pay* | Accept terms* | Wait for unaccepted party/parties |
| TERMS_LOCKED | Review & pay | Wait for Buyer | Wait for Buyer |
| AWAITING_APPROVAL | PayPal approval notice | Wait for Buyer | Wait for Buyer |
| AUTHORIZED | Wait for Seller | ShipForm / Add tracking | Wait for Seller |
| SHIPPED | Wait for delivery | Wait for delivery | Wait for delivery |
| IN_INSPECTION | Confirm receipt / DisputeSteps | Wait for Buyer | Wait for Buyer |
| DISPUTED | Add evidence | Add evidence | Wait for Buyer/Seller evidence |
| UNDER_REVIEW | Wait for Reviewer | Wait for Reviewer | Review dispute |
| RETURN_REQUESTED | ReturnForm / Add return tracking | Wait for Buyer | Wait for Buyer |
| FROZEN_EXTERNAL | PayPal case waiting notice | PayPal case waiting notice | PayPal case waiting notice |
| COMPLETED / REFUNDED / PARTIALLY_REFUNDED / VOIDED / CANCELLED | No normal role action | No normal role action | No normal role action |

* An already accepted DRAFT party sees the other party's waiting text instead.
Pending refund verification remains visible through the existing pending notice
and view helper; a terminal status is not used to claim a pending refund succeeded.
Existing switch-role guidance remains when another demo role has a task.

Decision content comes from loadDecisions/loadRecommendation and existing events.
It also renders for a recorded pending split/required-return decision, so those
choices are not hidden or described as completed refunds. No decision is invented
for a completed automatic/non-dispute transaction. VOIDED wording says payment
cancelled; partial amounts are recorded data, never a guessed amount or confidence.

## Screenshots

All are real local-browser captures from synthetic demo deals, not design examples:

- draft-seller-light-390.png: DRAFT before Seller acceptance; created with the normal
  create API so the existing Seller acceptance button can be exercised. The normal
  new-deal form auto-accepts as Seller and then correctly shows Buyer waiting.
- authorized-seller-light-390.png
- inspection-buyer-{light,dark}-{390,1440}.png
- under-review-buyer-light-390.png: no next-step button; Reviewer is named.
- decided-buyer-{light,dark}-{390,1440}.png: real recorded human decisions.
  Mobile light shows cancellation after the required return; desktop light shows
  the actual 12.00 USD partial refund. These amounts are QA data, not mockup values.

Viewport height 844px. Simulated PayPal + replay AI, Node 22.23.4 production build,
Chromium, reduced motion, explicit theme and a fixed QA-only clock. Reviewer used a
synthetic disposable code. No owner/provider secrets or real Sandbox calls.

## Evidence and limits

- walkthrough.json: four actual browser flows, 390/1440 x light/dark, with roles
  switched using the existing demo role cookie, and all action/confirmation UIs
  clicked. Each traversed DRAFT -> TERMS_LOCKED -> AWAITING_APPROVAL -> AUTHORIZED
  -> IN_INSPECTION -> DISPUTED -> UNDER_REVIEW -> a human decision.
  390 light additionally traversed RETURN_REQUESTED -> VOIDED through ReturnForm;
  390 dark ended COMPLETED; 1440 light PARTIALLY_REFUNDED; 1440 dark VOIDED.
  Both parties submitted evidence; receipt links were opened. No runtime exceptions.
- status-role-matrix.json: 184 rendered views, all 15 statuses x three roles x
  two widths x two themes, plus four Buyer empty-feed views. One next-step card,
  exactly one corresponding CTA (or no CTA for waiting), correct disclosures,
  no overflow or runtime exceptions. Maximum top of next-step card: 431px.
  Main confirm CTA was also checked above the mobile dock in all four walks.
- Most status fixtures come from the original seeded demo or real simulated flow.
  TERMS_LOCKED/SHIPPED also use normal API transitions (DEMO-IN-TRANSIT). REFUNDED
  uses an isolated stored-state presentation fixture; the current authorize-first
  review walk cancels an uncaptured approval rather than reaching that status.
  The empty-feed case uses an isolated technical event hidden by activityFeed.
  These synthetic view fixtures are not claimed as completed financial workflows.
- extra-flows.json: actual confirm receipt; simulated PayPal case opener, inquiry
  evidence/message, escalation, claim-stage PDF submission and Reviewer sync all
  succeeded through existing browser UI. Mobile disclosures work with keyboard
  and expand correctly after desktop resize. Later steps consume the same QA
  deals, so their current DB state may differ from the earlier screenshot state.
- accessibility.json: 1,172 expanded-content text/contrast checks across inspection
  and decided views, all roles/themes, no failures. Body >=14px; status/current-step
  chips >=12px; contrast uses actual token/card backgrounds.
- Nine focused component tests cover empty activity, receipt recommendation
  agreement and financial wording (void vs refund, return pending, partial pending,
  missing amount and missed-return capture). Required gates: 506 tests/49 files,
  typecheck and production build passed; git diff --check passed.

All QA writes are confined to /tmp/creident-story.sqlite (a copy of the previous
synthetic fixture); original demo DB/seed files unchanged. Helper scripts remain
under /tmp/creident-story-*. The app was served on local port 3229. No dependency,
merge or deployment. Real provider/webhook validation is outside this UI task.
