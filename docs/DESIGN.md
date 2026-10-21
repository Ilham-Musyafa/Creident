# DESIGN.md — HalcyVault (working name)

Status: **draft v0.1, 2026-10-20.** Items marked **[OPEN]** need the owner's decision.
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
- **deterministic rules decide**, AI only summarises evidence against the criteria,
- every action is written to an append-only, hash-chained audit log,
- the bias of the AI step is **measured and published**.

What it is **not**: a licensed escrow service, a payment provider, or a system without a
trusted operator. The platform operator still calls PayPal (capture/void/refund). The
honest claim is that every operator action is recorded and checkable, not that collusion
is impossible.

Production path (for the pitch): funds held by a licensed party (PayPal delayed
disbursement for approved partners, a bank escrow product, or a licensed payment
provider). PayPal's Acceptable Use Policy lists escrow services and marketplaces as
requiring pre-approval. Indonesian payment rules likely require a license or a licensed
partner for anyone handling third-party funds (not legal advice; verify before any real
launch).

## 2. Scope of the hackathon build

In scope:
- One physical-goods transaction between a buyer and a seller, in USD, on the Sandbox.
- Terms locked before payment.
- Authorize -> (capture | void | refund) flow using the PayPal Orders and Payments APIs.
- Evidence upload (photos taken in the app with a transaction code, tracking number,
  in-platform chat).
- AI evidence summary (structured JSON) feeding a rule engine.
- Human review for grey cases (a reason is required).
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

Both are documented honestly in the pitch. The demo implements Model A. Seller payout is
**simulated with an internal ledger, clearly labelled**, unless Payouts/delayed
disbursement proves usable in the Sandbox (not tested yet).

Fees: the Sandbox showed a 0.64 USD fee on a 10.00 USD sale, apparently not returned on
refund. The UI shows fees before payment. **Decided 2026-10-21: the platform bears the fee
on a refund**, so the buyer is refunded in full.

## 4. State machine

All transitions are atomic (compare-and-set on the status column inside a database
transaction). Each transition writes one audit event.

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
| `FROZEN_EXTERNAL` | A PayPal dispute/reversal event arrived; no money moves |
| `COMPLETED` | Captured and released (simulated payout recorded) |
| `REFUNDED` | Captured then refunded (full, or partial if supported) |
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
| `UNDER_REVIEW` | `COMPLETED` | Rule outcome RELEASE | capture |
| `UNDER_REVIEW` | `VOIDED` | Rule outcome REFUND while still only authorized | void |
| `UNDER_REVIEW` | `REFUNDED` | Rule outcome REFUND after capture | refund |
| any state, including a completed capture | `FROZEN_EXTERNAL` | Verified `CUSTOMER.DISPUTE.CREATED` or `PAYMENT.CAPTURE.REVERSED` webhook | none |
| `FROZEN_EXTERNAL` | previous or final | PayPal's decision overrides ours | none |

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
therefore land after PayPal's 3-day honor period; it usually still succeeds within the
29-day validity, but that is not guaranteed and a failure is logged. A silent
buyer means "accept" only if tracking shows delivery to the agreed destination.

## 5. Decision rules (rules first)

The rule engine is code with unit tests. The AI step only produces input for it.

| Rule | Condition | Outcome |
| --- | --- | --- |
| R1 | No tracking by ship-by deadline | VOID (no funds moved) |
| R2 | Tracking delivered, destination matches, no dispute in the window | RELEASE |
| R3 | Tracking destination or ship date inconsistent with the order | ESCALATE_HUMAN |
| R4 | Dispute open, both sides submitted evidence, AI summary meets the criteria for one side with clear support | RECOMMEND that side; a human confirms in the demo |
| R5 | Dispute open, evidence missing or contradictory, or partial delivery/damage | ESCALATE_HUMAN, with SPLIT as a possible human outcome |
| R6 | Any external PayPal dispute/reversal event | FREEZE |
| R7 | Evidence appears to contain instructions aimed at the AI | Flag, ignore the text for scoring, ESCALATE_HUMAN |

Human override requires a written reason and is recorded; in the demo a second reviewer
confirmation is simulated. A solo operator cannot make this independent in reality; say
so in the pitch.

An AI summary and rule recommendation are stored when a transaction enters
`UNDER_REVIEW`; the recommendation cannot move funds. A human may record a `SPLIT`
decision with a reason, but it remains pending and moves no funds because the split
amount and payment treatment are not yet defined by the owner.

## 6. Role of the AI

- Input: evidence items (text, in-app photos, tracking data) wrapped as **data**.
- Output: strict JSON — per criterion: finding, supporting quote or evidence id,
  and whether evidence is missing. No free-form verdict that can move money.
- **No tool access.** The AI cannot call PayPal and cannot write transaction state.
- Identity masking for the evidence-assessing step (names replaced by "Buyer"/"Seller",
  order of presentation randomised). A separate **risk layer** may use account history
  and relationship signals; hiding history from fraud checks would help repeat offenders.
- No self-reported confidence number is used as a threshold. Consistency is measured by
  running the same case several times.
- Provider and model **[TENTATIVE, 2026-10-20]**: DeepSeek (V4.1 Flash) through the
  owner's Hive API key. Not verified yet. Before building on it check: the exact model
  name and the API terms of the provider, whether it returns reliable strict JSON, and
  whether it accepts images (if text-only, photo evidence must be described by another
  step or model). Keep the provider behind a small interface so it can be swapped.
- Judges must be able to run the project without the owner's key: provide a mode that
  replays recorded AI outputs for the demo cases, plus instructions to use their own key.
- Use only synthetic evidence in the demo and tests; do not send real personal data to
  any third-party AI API.

## 7. Audit log

- Table `events`, append-only (application code has no update/delete path for it).
- Each row: `id`, `tx_id`, `ts`, `actor`, `type`, `payload_json`, `prev_hash`, `hash`
  where `hash = SHA-256(prev_hash || canonical_json(row without hash))`.
- A verification page recomputes the chain and shows the head hash. The head hash is
  published periodically (for example committed to the public repo) so later rewriting
  is detectable. Honest limit: the operator holds the database and the PayPal keys.
- Store PayPal `debug_id` and request ids in the payload of related events.

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


## 8. Data model (draft)

- `users` (id, role: buyer|seller|reviewer, display name) — demo accounts only.
- `transactions` (id, status, buyer_id, seller_id, item, amount, currency, terms_json,
  terms_hash, ship_by, inspection_until, paypal_order_id, paypal_auth_id,
  paypal_capture_id, created_at, updated_at).
- `evidence` (id, tx_id, submitted_by, kind: photo|tracking|chat|note, content_ref,
  content_hash, created_at).
- `decisions` (id, tx_id, rule_id, outcome, ai_summary_json, action, reasons_json,
  requires_human, reviewer_id, reason, created_at). One rule recommendation per
  transaction; human decisions are separate rows.
- `events` (audit log, section 7).
- `paypal_events` (event_id UNIQUE, type, received_at, processed_at) for webhook de-duplication.
- `idempotency` (key UNIQUE, tx_id, action, result).

## 9. Endpoints (draft)

- `POST /api/transactions` create with terms; `POST /api/transactions/:id/accept`
- `POST /api/transactions/:id/pay` create the PayPal order, return the approval URL
- `GET /api/paypal/return` buyer returns after approval; triggers authorize
- `POST /api/transactions/:id/ship` seller adds tracking
- `POST /api/transactions/:id/confirm` buyer confirms receipt
- `POST /api/transactions/:id/dispute`, `POST .../evidence`
- `GET /api/transactions/:id/review` stored recommendation;
  `POST /api/transactions/:id/review` human decision with reason
- `POST /api/webhooks/paypal` signature verification, de-duplication, state freeze
- `GET /api/audit/:id` and `GET /api/audit/verify`
- Mock courier: `GET /api/mock-courier/:tracking`

Stack **[DECIDED 2026-10-20]**: Next.js (App Router) + TypeScript, API routes for the backend,
SQLite for storage, Tailwind for UI (matches the owner's existing Verselly stack).
Hosting **[OPEN]**: run-instructions in the README are enough for the rules; a hosted demo
(for example on Render, a sponsor) is optional and must stay up until judging ends
(15 Dec 2026).

## 10. Test plan (fairness and robustness)

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

## 11. Schedule (backward from 11 Nov 2026)

| Dates | Work |
| --- | --- |
| 21-22 Oct | Finish Sandbox tests (void already done; webhooks, disputes, Platform/Payouts), create the public repo (license: MIT), commit these docs |
| 23 Oct - 1 Nov | Core flow: state machine, PayPal calls, audit log, minimal UI that can be demoed |
| 2-7 Nov | AI evidence summary, rules, review UI, labelled test set and report, UI polish |
| 8-10 Nov | README (English), demo video under 3 minutes, description text, clean secrets, final run-through from a clean clone |
| 11 Nov | Submit (deadline 13 Nov 03:00 WIB) |

## 12. Open decisions

- Fund model: **A decided** (2026-10-20). Fee on a refund: platform (decided 2026-10-21).
- Time parameters: 3 / 2 / 2 days (decided 2026-10-21).
- AI provider: tentative DeepSeek V4.1 Flash via Hive; verify before building (section 6).
- Final project name (the word "Vault" suggests custody; consider before submitting).
- Hosting. (License: MIT chosen; the owner may relicense his own code later. Database:
  SQLite decided.)
- Whether Payouts/delayed disbursement can be shown, or the payout stays simulated.
- Whether PayPal logos in the video are acceptable (ask Devpost support).
