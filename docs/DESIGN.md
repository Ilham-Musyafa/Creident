# DESIGN.md — HalcyVault (working name)

Status: **prototype implementation reference, updated 2026-10-21.** Items marked **[OPEN]** need the owner's decision.
Items marked **[PROPOSED]** are suggestions that have not been approved yet.
Items marked **[DECIDED]** were approved by the owner; **[TENTATIVE]** ones still need
verification.
Facts about PayPal behaviour that were tested are in `docs/SANDBOX-NOTES.md`.

## 1. Goal and positioning

Peer-to-peer sales of physical goods in Indonesia often rely on a "rekber" (joint account)
run by an admin who holds the money. Reported scams include admins who collude with
sellers. HalcyVault is a **prototype of a dispute-mediation layer**:

- terms are fixed before payment,
- the funds are only *authorized* by PayPal until the rules say release or refund,
- **deterministic rules recommend dispute outcomes; a human confirms**, AI only summarises evidence against the criteria,
- every action is written to an append-only, hash-chained audit log,
- a replay evaluation of the harness/rules is published; live-model bias measurement remains pending.

What it is **not**: an escrow service, a payment provider, or a system without a
trusted operator. The platform operator still calls PayPal (capture/void/refund). The
honest claim is that every operator action is recorded and checkable, not that collusion
is impossible.

A production proposal would need an appropriately authorized payment partner and
regulatory review in Indonesia. PayPal's Acceptable Use Policy lists escrow services
and marketplaces as requiring pre-approval. Partner products, delayed disbursement
and production permission have not been established by this Sandbox prototype.

## 2. Scope of the hackathon build

In scope:
- One physical-goods transaction between a buyer and a seller, in USD, on the Sandbox.
- Terms locked before payment.
- Authorize -> (capture | void | refund) flow using the PayPal Orders and Payments APIs.
- Text evidence labelled photo, tracking, chat or note. The UI displays a transaction
  code and evidence guidance; camera capture, file upload and in-platform chat are not built.
- AI evidence summary (structured JSON) feeding a rule engine.
- Human confirmation for every dispute outcome, with a required reason; R5 also
  escalates damage/missing-parts dispute types regardless of the AI summary.
- Audit-log page with hash-chain verification.
- Handling of PayPal-side dispute/reversal events (freeze state).
- A measured fairness/robustness report from a labelled test set.

Out of scope: see `AGENTS.md`.

## 3. Fund model

Two options were considered:

- **Model A — AUTHORIZE then CAPTURE (chosen for the demo, decided 2026-10-20).** The buyer approves,
  we authorize (funds reserved by PayPal), and later capture on release or void on
  cancel. Tested in the Sandbox. Clear story. Risk in real life: honor period is 3 days;
  capture after that depends on PayPal's risk assessment and the buyer's funds; the
  authorization expires after 29 days. Capture is impossible to undo with void (only refund).
- **Model B — CAPTURE first, refund on dispute.** More robust against the honor-period
  problem, but the platform then holds the money (custody and licensing implications) and
  a refund takes the merchant's balance, not the seller's.

The demo implements Model A. **Seller payout and an internal payout ledger are not
implemented.** Release means capture into the platform's Sandbox merchant account;
simulated mode instead records a local simulated capture. Payouts/delayed disbursement
have not been tested.

Fees: the Sandbox showed a 0.64 USD fee on a 10.00 USD sale, apparently not returned on
refund. The UI shows fees before payment. **Decided 2026-10-21: the platform bears the fee
on a refund**, so the buyer is refunded in full.

## 4. State machine

Successful status changes, stored PayPal IDs and their audit event commit atomically
inside SQLite. A money action reserves its request ID before the remote call; the
remote PayPal call is not part of the SQLite transaction. An interrupted call stays
pending for manual checking. No financial reconciliation worker is built.

| State | Meaning |
| --- | --- |
| `DRAFT` | Seller is writing the terms |
| `TERMS_LOCKED` | Both parties accepted the terms; terms hash stored |
| `AWAITING_APPROVAL` | PayPal order created, buyer has not approved yet |
| `AUTHORIZED` | Buyer approved, order authorized, funds reserved |
| `SHIPPED` | Seller submitted tracking within the ship-by deadline |
| `IN_INSPECTION` | Tracking shows delivery; the buyer's inspection window is running |
| `DISPUTED` | Buyer opened a dispute inside the window |
| `UNDER_REVIEW` | Evidence collected, rules or a human are deciding |
| `RETURN_REQUESTED` | Refund decided; waiting for the buyer to return the item before any money moves |
| `FROZEN_EXTERNAL` | A matching PayPal case/reversal was detected; local money actions are blocked |
| `COMPLETED` | Captured into the Sandbox merchant account (or simulated capture); no seller payout |
| `REFUNDED` | Captured then fully refunded; partial/split execution is not implemented |
| `VOIDED` | Authorization voided before capture |
| `CANCELLED` | Cancelled before payment |

Transitions (guards in italics):

| From | To | Trigger and guard | PayPal call |
| --- | --- | --- | --- |
| `DRAFT` | `TERMS_LOCKED` | Both parties accept; *terms hash stored* | none |
| `TERMS_LOCKED` | `AWAITING_APPROVAL` | Buyer starts payment | create order (AUTHORIZE) |
| `AWAITING_APPROVAL` | `AUTHORIZED` | Buyer approved; *order status confirms approval* | authorize order |
| `AUTHORIZED` | `VOIDED` | Ship-by deadline passed without tracking | void authorization |
| `AUTHORIZED` | `SHIPPED` | Seller submits tracking; *within deadline* | none |
| `SHIPPED` | `IN_INSPECTION` | Tracking says delivered; *destination matches agreed address* | none |
| `SHIPPED` | `UNDER_REVIEW` | Tracking invalid or destination mismatch | none |
| `IN_INSPECTION` | `COMPLETED` | Buyer confirms, or the window expires with no dispute; *no external dispute open* | capture |
| `IN_INSPECTION` | `DISPUTED` | Buyer opens dispute inside the window | none |
| `DISPUTED` | `UNDER_REVIEW` | Evidence deadline reached or both sides submitted | none |
| `UNDER_REVIEW` | `COMPLETED` | Human confirms RELEASE with a written reason | capture |
| `UNDER_REVIEW` | `RETURN_REQUESTED` | Human REFUND with the return required (default; added 2026-10-21, owner approved) | none |
| `RETURN_REQUESTED` | `VOIDED` / `REFUNDED` | Buyer's return tracking shows delivery to the seller before `return_by` | void (or refund if captured) |
| `RETURN_REQUESTED` | `COMPLETED` | Return deadline passed without a delivered return | capture |
| `UNDER_REVIEW` | `VOIDED` | Human REFUND while still only authorized, return waived (for example item never arrived) | void |
| `UNDER_REVIEW` | `REFUNDED` | Human REFUND after capture, return waived | refund |
| any state, including a completed capture | `FROZEN_EXTERNAL` | Matching open PayPal case from polling, or verified `CUSTOMER.DISPUTE.CREATED` / `PAYMENT.CAPTURE.REVERSED` webhook | none |
| `FROZEN_EXTERNAL` | prior local state | `EXTERNAL_RESOLVED` from resolved PayPal case / verified notification; no other known open case | none |

External dispute/reversal webhooks can arrive after capture and completion. The webhook
therefore freezes a completed transaction too, preserving its prior status for a later
`CUSTOMER.DISPUTE.RESOLVED` event. A verified resolution resumes that prior status;
the demo does not infer a refund or release from the notification alone.

After any transition that captures (`COMPLETED`), the seller's tracking number is attached
to the PayPal order with Orders v2 `POST /v2/checkout/orders/{id}/track` (carrier `OTHER`,
`notify_payer: false`). It is a side step, not a transition: it never changes the status, a
failure is written to the audit log (`PAYPAL_TRACKING_FAILED`) and retried by the deadline job
up to three times. PayPal documents that tracking is accepted only after capture (added
2026-10-21, owner approved).

Rules that come from tested Sandbox behaviour:
- Authorize is only called after the buyer approved the order (`ORDER_NOT_APPROVED`).
- Once captured, only refund is possible (`PREVIOUSLY_CAPTURED`).
- Refund total must not exceed the captured amount.

Time parameters are configurable. **Decided 2026-10-21:** ship-by 3 days (`SHIP_BY_DAYS`),
inspection 2 days (`INSPECTION_DAYS`), and evidence 2 days (`EVIDENCE_DAYS`). Capture can
therefore land after PayPal's 3-day honor period; success within the 29-day validity
is not guaranteed and has not been tested here after day 3. A failure is logged. A silent
buyer means "accept" only if tracking shows delivery to the agreed destination. Return
shipping defaults to 3 days (`RETURN_DAYS`); courier delivery/return checks are simulated.

## 5. Decision rules (rules first)

The rule engine is code with unit tests. The AI step only produces input for it.

| Rule | Condition | Outcome |
| --- | --- | --- |
| R1 | No tracking by ship-by deadline | VOID (no funds moved) |
| R2 | Tracking delivered, destination matches, no dispute in the window | RELEASE |
| R3 | Tracking destination or ship date inconsistent with the order | ESCALATE_HUMAN |
| R4 | Dispute open, both sides submitted evidence, AI summary meets the criteria for one side with clear support | RECOMMEND that side; a human confirms in the demo |
| R5 | Dispute open, evidence missing or contradictory, no usable AI summary, or the buyer's dispute type is `damaged` (arrived damaged) or `incomplete` (parts missing) (always, whatever the AI summary says; owner decision 2026-10-21) | ESCALATE_HUMAN, with SPLIT as a possible human outcome |
| R6 | Any external PayPal dispute/reversal event | FREEZE |
| R7 | Evidence appears to contain instructions aimed at the AI | Flag, ignore the text for scoring, ESCALATE_HUMAN |

Rules run in priority order: R6, R7, shipping checks (R1/R3/R2 as applicable), then
dispute R5/R4. Damage/missing-parts types never receive an automatic release/refund
recommendation, even if another higher-priority rule fires. Every human dispute
decision requires a written reason and is recorded. There is one demo reviewer; no
independent second-reviewer confirmation is implemented.

An AI summary and rule recommendation are stored when a transaction enters
`UNDER_REVIEW`; the recommendation cannot move funds. A human may record a `SPLIT`
decision with a reason, but it remains pending and moves no funds because split
execution was explicitly deferred by the owner (2026-10-21). No partial refund or split payout is built.

## 6. Role of the AI

- Input: text evidence items (including descriptions labelled photo, tracking or chat)
  wrapped as quoted **data**. No photo bytes are sent to the model.
- Output: strict JSON — per criterion: finding, supporting evidence IDs,
  and whether evidence is missing. No free-form verdict that can move money.
- **No tool access.** The AI cannot call PayPal and cannot write transaction state.
- Identity masking for the evidence-assessing step (names replaced by "Buyer"/"Seller",
  order of presentation randomised with a seed). Account-history and relationship
  risk checks are not implemented.
- No self-reported confidence number is used as a threshold. Consistency is measured by
  running the same case several times.
- Provider and model **[TENTATIVE, 2026-10-20]**: DeepSeek (V4.1 Flash) through the
  owner's Hive API key. Not verified yet. Before building on it check: the exact model
  name and the API terms of the provider, whether it returns reliable strict JSON, and
  whether it accepts images (if text-only, photo evidence must be described by another
  step or model). Keep the provider behind a small interface so it can be swapped.
- Replay mode is implemented and defaults on when `AI_API_KEY` is empty. Live mode
  uses `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` with the fetch-based OpenAI-compatible
  adapter. A live-provider run remains pending.
- Use only synthetic evidence in the demo and tests; do not send real personal data to
  any third-party AI API.

### 6.1 AI assist features (owner-approved 2026-10-22)

Goal: a larger, visible AI role at every stage of a deal without giving the AI any power
over money or outcomes. Rules and people still decide; every AI output is a **draft** that
a person accepts, edits or ignores.

Shared guard rails (all assists use `src/lib/ai/assist.ts`):
- Input is quoted data inside `<untrusted_data>`; user text is checked for injection
  patterns, and a flagged input is shown to the person, never silently trusted.
- Output is one JSON object checked by a strict, feature-specific validator (exact keys,
  bounded text, only known evidence or criterion ids). One retry, then the assist is
  "unavailable" and the manual flow continues unchanged.
- Claims about evidence must cite evidence ids; a claim without a valid citation is dropped.
- No tool access, no PayPal calls, no state transitions from AI output. Money-moving code
  never reads assist output.
- When a person uses a draft, the audit event records `feature`, `mode`, `model`,
  `promptVersion`, `promptHash` and `outputHash`, plus whether the person accepted it
  unchanged or edited it. The draft text itself is stored only where the feature says so.
- Replay mode uses recorded drafts for labelled demo deals and tests (no keys needed);
  live mode uses the same OpenAI-compatible provider as section 6.
- Synthetic data only in demos and tests.

| # | Assist | Stage | What the AI drafts | Who confirms | Owner of the work |
|---|---|---|---|---|---|
| 1 | Terms assistant | New deal | Structured terms from a pasted listing or chat: condition, included items checklist, required opening photos | Seller drafts, buyer accepts before terms lock | Codex C16 |
| 2 | Evidence completeness check | Dispute, evidence window | Which agreed checklist items or required photos are still missing, per side | Each party sees prompts for their own side; no verdict | Codex C17 |
| 3 | Reviewer copilot | Human review | Cited per-criterion notes, a draft decision reason, and for R5 cases a suggested partial-refund range with its basis | Reviewer accepts or edits; the decision stays the reviewer's | Codex C18 |
| 4 | Outbound drafts | After a decision or a PayPal case | A message to PayPal for the dispute bridge and a courier claim pack for transit damage | Seller (or reviewer) approves before anything is sent or downloaded | Claude (done 2026-10-22) |
| 5 | Evidence translation | Review | A translation of evidence text into the reviewer's language; the original and its hash stay authoritative | Reviewer reads both | Claude, after C18 |

Implementation of #2 (C17): buyer/seller-only `POST
/api/transactions/{id}/ai/evidence-check` accepts an empty JSON object during an open
`DISPUTED` evidence window. It reads locked `criteria` and `includedItems` (up to 12
of each, 200 characters per item); legacy terms without criteria use the condition
line. Unsupported/empty checklists fall back to manual guidance. Only the requesting
side's evidence is sent, as B1/B2 or S1/S2 aliases, with that side's dispute-type
guidance. Internal evidence ids and the other side's evidence are excluded.

`runAssist` uses feature `evidence-check`, version `evidence-check-v1`. Exact JSON
contains one covered/missing/unclear entry per known check id and known cited aliases;
covered without a citation becomes unclear. Up to five suggestions must come from a
small fixed vocabulary, preventing generated names, links or verdict words in them.
This checks text descriptions only: covered does not mean proven or inspected photos.
Replay fixtures match the full own-side snapshot of the labelled Road bike helmet
(empty buyer/seller evidence and one recorded buyer photo description); unmatched
snapshots return unavailable, not a generic reused finding. No live-provider run has
been verified.

A durable reservation in the existing `idempotency` table permits one initial run per
side, then one per new own evidence item (up to 50). Failed/unavailable and interrupted
runs consume that reservation too; reloads and concurrent requests cannot bypass it.
`EVIDENCE_CHECK_RUN` records metadata, side, own evidence count, status counts and the
injection flag, with no checklist, evidence or suggestion text. Results are not saved
as recommendations, never feed the rule engine/review summary, never block evidence
submission and never extend deadlines. If the window closes or own evidence changes
during the call, the result is discarded; metadata is still audited.

Implementation of #4: `POST /api/transactions/{id}/ai-drafts` (`paypal-message` for seller or
reviewer when a PayPal case is open; `courier-claim` for the seller of a "damaged" dispute)
stores the draft in `ai_drafts` and logs `AI_DRAFT_CREATED` (metadata only). The PayPal
evidence action accepts an approved `note` (+ optional `draftId`); the app, not the AI,
appends the terms hash and audit head. `POST /api/transactions/{id}/courier-claim` returns a
PDF with the approved letter, cited timeline, evidence hashes, terms hash and audit head,
and logs `COURIER_CLAIM_PACK_CREATED`; nothing is sent to a courier. Evidence is shown to the
model as aliases (B1, S1), never internal ids.

Measured: share of drafts accepted unchanged, edited or ignored (per feature), shown on
the Fairness page once there is data. Not measured: whether drafts are correct in general.

## 7. Audit log

- Table `events`, append-only (application code has no update/delete path for it).
- Each stored row has `id`, `tx_id`, per-transaction `seq`, `ts`, `actor`, `type`,
  `payload_json`, `prev_hash`, `hash`. The hashed body is `{seq, txId, ts, actor, type,
  payload}`; `hash = SHA-256(prevHash + "\n" + canonicalJson(body))`. Database row
  IDs are not part of that body.
- A verification page recomputes the chain and shows the head hash. The head hash
  can be published through the manual signed-checkpoint command below so later
  rewriting can be detected by someone retaining that checkpoint. No periodic
  publishing job or operational checkpoint is committed. Honest limit: the operator
  holds the database and the PayPal keys.
- Store PayPal `debug_id` and request ids in the payload of related events.

PayPal dispute bridge (owner-approved C11, 2026-10-21):

- `paypal_disputes` stores `tx_id`, unique `dispute_id`, `status`, `stage`, `reason`,
  `actions_json`, and `updated_at`; `CREATE TABLE IF NOT EXISTS` migrates existing DBs.
- Reviewer-only `POST /api/paypal/disputes/sync` and `POST /api/jobs/tick` poll cases
  scoped to each stored capture ID, then read case details and match the seller
  transaction ID exactly. Discovery is limited by `PAYPAL_DISPUTE_WINDOW_DAYS = 180`
  in `src/lib/paypalDisputes.ts`, inclusive of the cutoff. Age starts at the audited
  capture event for the stored capture ID, not a later status update; legacy/seeded
  captured rows without that event fall back to their creation event, then DB
  `created_at`. This is a discovery policy, not a guarantee of PayPal eligibility.
- `PAYPAL_DISPUTE_MAX_POLL_CALLS = 50` is a hard per-invocation budget shared by
  `listDisputes` and `getDispute` calls, including failures. It applies to the polling
  phase of sync, tick and the simulated opener. OAuth token acquisition/refresh and
  unrelated tick money/tracking calls are outside this dispute-read budget.
- Known open cases are age-exempt, including case IDs mapped by verified
  `CUSTOMER.DISPUTE.CREATED` webhooks. Refresh them directly before discovery, even
  when absent from the list. Known resolved cases are not refreshed. If the open
  backlog exceeds the budget, defer the remainder to a later run (owner-approved
  hard-cap policy, 2026-10-22). SQLite `paypal_dispute_poll_attempts` records attempt
  order separately for case/capture and sandbox/simulated mode, before each call,
  so restarts, tied clocks and failures cannot keep one entry at the front forever.
  Discovery captures rotate too. A large persistent open backlog can consume the
  whole budget and delay discovery; no background continuation worker is built.
  Result rows with unattempted work have `deferred: true`; run sync/tick again.
  Budget deferral is not a PayPal failure and does not resolve/unfreeze a case.
  No public webhook is needed for polling; there is no background worker.
- Case updates and existing EXTERNAL_DISPUTE/EXTERNAL_RESOLVED transitions commit
  atomically. Poll transition events carry `source: "disputes_api"` and `disputeId`.
  Verified webhook resolution can map via the case table. A resolved case stays
  resolved if a stale open response or created notification arrives later. The deal
  stays frozen while another known PayPal case is open. RESOLVED resumes the prior
  state, without inferring or executing a financial outcome. Freezing blocks local
  actions; it does not stop PayPal from acting on its own case. The bridge does not
  change rules R1-R7.
- Seller/reviewer `POST /api/transactions/:id/paypal-dispute/evidence` refreshes
  PayPal's offered actions first. `provide_evidence` sends a text-only single-page
  PDF via the existing multipart client; its evidence type follows PayPal's reason.
  The document includes item/amount, canonical locked terms and hash, tracking,
  evidence content/submitter/content hashes, decision/reviewer reason, and a verified
  audit head. Changed locked terms, altered/missing audited evidence, or an invalid chain block submission. All PDF
  text is escaped as data; long documents shrink to fit rather than drop rows.
  Unicode is rendered as ASCII by the existing PDF helper; hashes cover original
  UTF-8 data. Original photo files are not uploaded by this text-document bridge.
- If only `send_message` is offered, send a short message and state that PDF evidence
  needs the claim stage. Seller/reviewer `POST .../paypal-dispute/escalate` requires
  `confirm: true` and the currently offered `escalate` action. The UI asks inside
  the page, without a browser confirmation dialog. No acceptance/offer/refund API
  actions are added here.
- Audit events: PAYPAL_DISPUTE_DETECTED (once per case),
  PAYPAL_DISPUTE_EVIDENCE_SENT, PAYPAL_DISPUTE_MESSAGE_SENT,
  PAYPAL_DISPUTE_ESCALATED, and PAYPAL_DISPUTE_ACTION_FAILED. Failures retain
  PayPal's issue and `debug_id`, never tokens, secrets, or raw provider responses.
  Submission events record the terms/evidence/PDF hashes and audit head. Local
  claims prevent duplicate submissions; failed or interrupted sends require manual
  checking before retry. C5 reconciliation remains a separate, unimplemented proposal.
- The deal and review panels show case details, last check, offered actions, and
  permitted seller/reviewer buttons. Reviewer access-code checks still apply.
- In `PAYPAL_MODE=simulated`, the same calls use SIM- case IDs and labelled events.
  Buyer/reviewer `POST .../paypal-dispute/simulate` can open an inquiry only on a
  completed labelled demo deal. Simulated cases are restored from stored metadata
  after gateway recreation; real PayPal cases are never sent through the simulator.
- The owner's Sandbox probe proved inquiry messaging, seller escalation, and
  multipart PDF evidence in claim/CHARGEBACK, with updates delayed by minutes.
  The integrated bridge still needs an owner-run Sandbox check. Real webhook
  delivery also remains untested.


Signed checkpoints (owner-approved CloneIDE item 2, 2026-10-21):

- `npm run checkpoint` uses `node:crypto` Ed25519 and `AUDIT_SIGNING_KEY` (private
  PEM from environment, loaded from `.env` by the script runner). It verifies all
  transaction chains from one SQLite read snapshot before writing
  `audit-checkpoints/<UTC timestamp>.json`. Broken chains produce no checkpoint.
- The signed payload is canonical JSON of `{createdAt, transactions}`; transactions
  are ordered by ID and contain `{txId, length, headHash}`. The document adds a base64
  `signature` field outside that payload. No private material is written or logged
  during checkpoint creation. The only intentional private-key display is the
  owner's explicit local `--generate-key` command.
- `npm run checkpoint -- --generate-key` prints a new pair once and writes only the
  public key to `audit-checkpoints/public-key.pem`. Store the private PEM in `.env`
  only. The initial committed public key is a bootstrap with its private half
  discarded. Generation can replace it before the first JSON checkpoint, and refuses
  rotation afterwards so earlier checkpoints are not silently invalidated.
- Publish the public key and timestamped JSON through a reviewed repository commit
  or another independent channel. The script creates files; it does not push them.
  A verifier needs its own trusted copy of the public key and published checkpoint.
- `verifyCheckpoint()` validates document shape and Ed25519 signature before
  comparing every recorded entry with a verified current chain. Equal length/head
  means unchanged; a longer chain retaining the old head at the original position
  means extended; a broken, shorter, missing, or replaced chain means rewritten.
  Deals created after the checkpoint are reported as not checkpointed. Empty chains
  use the genesis hash. `/audit` displays the latest verified checkpoint time and
  per-deal results; missing checkpoint/key and invalid signatures are explicit.
- This makes rewriting detectable by anyone holding the published checkpoint and
  trusted public key; it does not make rewriting impossible. The operator can still
  rewrite the database and replace server-local files, or sign a later replacement.
  Previously retained checkpoints remain the independent comparison point.


## 8. Data model (implementation summary)

- `users` (id, role: buyer|seller|reviewer, display name) — demo accounts only.
- `transactions` (id, status, buyer_id, seller_id, item, amount, currency, terms_json,
  terms_hash, ship_by, inspection_until, paypal_order_id, paypal_auth_id,
  paypal_capture_id, evidence_until, tracking_number, return_by, return_tracking,
  captured, frozen_from, created_at, updated_at).
- `evidence` (id, tx_id, submitted_by, kind: photo|tracking|chat|note, content_ref,
  content_hash, created_at).
- `decisions` (id, tx_id, rule_id, outcome, ai_summary_json, action, reasons_json,
  requires_human, reviewer_id, reason, created_at). One rule recommendation per
  transaction; human decisions are separate rows.
- `events` (audit log, section 7).
- `paypal_events` (event_id UNIQUE, type, received_at, processed_at) for webhook de-duplication.
- `idempotency` (key UNIQUE, tx_id, action, result).
- `paypal_disputes` (tx_id, dispute_id UNIQUE, status, stage, reason, actions_json, updated_at).
- `paypal_dispute_poll_attempts` (mode, kind: case|capture, resource_id, attempt_seq;
  composite primary key mode/kind/resource_id) — operational polling order only,
  migrated with CREATE TABLE IF NOT EXISTS; it does not alter audit chains.

## 9. Endpoints (implementation summary)

- `POST /api/transactions` create with terms; `POST /api/transactions/:id/accept`
- `POST /api/transactions/:id/pay` create the PayPal order, return the approval URL
- `GET /api/paypal/return` buyer returns after approval; triggers authorize
- `POST /api/transactions/:id/ship` seller adds tracking
- `POST /api/transactions/:id/confirm` buyer confirms receipt
- `POST /api/transactions/:id/dispute`, `POST .../evidence`, `POST .../return`
- `GET /api/transactions/:id/review` stored recommendation;
  `POST /api/transactions/:id/review` human decision with reason
- `POST /api/webhooks/paypal` signature verification, de-duplication, state freeze
- `GET /api/audit/:id`, `GET /api/audit/:id/export` (CSV), `GET /api/audit/verify`
- `POST /api/jobs/tick` applies due shipment/inspection/evidence/return deadlines,
  retries eligible tracking submissions and polls PayPal disputes; no background worker.
- `POST /api/paypal/disputes/sync` reviewer-only PayPal dispute poll
- `POST /api/transactions/:id/paypal-dispute/evidence`, `POST .../escalate` seller/reviewer
- `POST /api/transactions/:id/paypal-dispute/simulate` demo-only simulated case
- Mock courier: `GET /api/mock-courier/:tracking`

Stack **[DECIDED 2026-10-20]**: Next.js (App Router) + TypeScript, API routes for the backend,
SQLite for storage, Tailwind for UI (matches the owner's existing Verselly stack).
Hosting **[OPEN]**: run-instructions in the README are enough for the rules; a hosted demo
(for example on Render, a sponsor) is optional and must stay up until judging ends
(15 Dec 2026).

## 10. Test plan (fairness and robustness)

Current measurement (2026-10-21): `eval/report.md` and `eval/results.json` record a
**replay** run of 50 synthetic cases (40 disputes + 10 injection cases), k=3, six
variants per case. The owner reviewed 10 labels individually and accepted 40 drafts
without individual review; the R5 follow-up is in
`eval/owner-label-review-2026-10-21-r5.json`. No base result differs from the labels.
False release: 0/23; false refund: 0/23; gap: 0.0 percentage points; variant flips:
0/300; repeat consistency: 100/100 comparisons; human escalation: 23/50 (46.0%);
non-escalated agreement: 27/27; injection cases avoiding escalation: 0/10. These
small-sample replay results check harness/rules behavior, not a live model. Recorded
summaries were authored from the original draft labels; counterfactuals reuse them.
The harness exercises R3/R4/R5/R7 (one case sets mismatched tracking facts); shipping
rules also have unit tests. Live evaluation and independent annotation remain pending.

The following larger set and additional measurements are **targets, not completed work**:

- Labelled set of about 150-200 cases plus 30-50 prompt-injection cases. Labels written
  before running the AI, ideally by two people, with disagreements noted.
- Balance cases by which side is right.
- Metrics: false-release rate, false-refund rate and their difference, counterfactual
  flip rate (swap names/order/length/language), consistency over k runs, escalation rate
  and accuracy on non-escalated cases, injection attack success (target 0 decision
  changes), forged-evidence detection rate (report as is, expected to be low).
- With about 100 cases per class the confidence interval is wide (a 5% error rate is
  about +/-4 points). Report the numbers as indicative, not proof.
- Scenarios: long emotional buyer vs short seller; formal vs slang; swapped order;
  10 photos vs 1; genuine photo of a different unit; valid tracking for another parcel;
  delivered but "empty box"; damage in transit; buyer's remorse disguised as "not as
  described"; subjective condition; partial delivery; injection through image text, file
  name, chat, item description; buyer and seller collusion patterns (sybil accounts).

## 11. Original schedule (planning baseline, 2026-10-20)

The schedule below is historical. Current completed work and remaining checks are
in `docs/HANDOFF.md`; do not read these dates as test-completion claims.

| Dates | Work |
| --- | --- |
| 21-22 Oct | Finish Sandbox tests (void already done; webhooks, disputes, Platform/Payouts), create the public repo (license: MIT), commit these docs |
| 23 Oct - 1 Nov | Core flow: state machine, PayPal calls, audit log, minimal UI that can be demoed |
| 2-7 Nov | AI evidence summary, rules, review UI, labelled test set and report, UI polish |
| 8-10 Nov | README (English), demo video under 3 minutes, description text, clean secrets, final run-through from a clean clone |
| 11 Nov | Submit (deadline 13 Nov 03:00 WIB) |

## 12. Open decisions

- Business model: 1.5% service fee paid by the seller (decided 2026-10-21; documented, not charged in the prototype).
- Split: recorded only, no payout (decided 2026-10-21).

- Fund model: **A decided** (2026-10-20). Fee on a refund: platform (decided 2026-10-21).
- Time parameters: 3 / 2 / 2 days (decided 2026-10-21).
- AI provider: tentative DeepSeek V4.1 Flash via Hive; verify before building (section 6).
- Final project name (the word "Vault" suggests custody; consider before submitting).
- Hosting. (License: MIT chosen; the owner may relicense his own code later. Database:
  SQLite decided.)
- Seller payout remains unimplemented; any Payouts/delayed-disbursement integration
  would need a separate owner decision and Sandbox test.
- Whether PayPal logos in the video are acceptable (ask Devpost support).
