# Proposal: partial refunds and PayPal "accept claim / make offer"

Status (2026-10-22 07:15 WIB): owner **approved A** (partial refund decided by the reviewer)
with the proposed defaults: no return by default for a partial refund, and the reviewer sets
the amount even when both parties agree. **B was not approved** (do not build it). The fee
minimum/maximum idea was not approved either. A is implemented on `feat/c19-partial-refund` after C18 PR #56 merged, pending
review and a real integrated Sandbox partial-refund run. B remains unimplemented.

## Why

- R5 sends damage and missing-part disputes to a person. The fair outcome is often a
  partial refund (for example the value of a missing adapter), but today a SPLIT decision is
  recorded only and moves no money.
- When a PayPal case is open, the seller can settle faster than any review by accepting the
  claim or offering a partial refund inside PayPal. Today the bridge can only message,
  escalate and send evidence.

## A. Partial refund decided by the reviewer (local mediation)

- New decision option `PARTIAL_REFUND` with `amount` (0 < amount < deal amount, two
  decimals, USD) and a required reason. The AI copilot (C18) may suggest a range with its
  basis; the reviewer types the final amount.
- Money: capture the authorization, then refund `amount` on the capture
  (`POST /v2/payments/captures/{id}/refund` with `amount`), each call with its own
  `PayPal-Request-Id`. The seller keeps the rest. Whether the item is returned is a
  reviewer checkbox, as with `requireReturn` today (default: no return for a partial refund).
- State machine: `UNDER_REVIEW -> PARTIALLY_REFUNDED` (final). If the refund call fails after
  capture, the deal stays `COMPLETED` with a recorded `PAYPAL_ERROR` and a visible
  "refund pending" notice; no automatic retry without an idempotent request id check.
- Fees: the platform bears the PayPal fee on the refunded part, consistent with the
  2026-10-21 decision.
- Audit: decision, capture and refund events carry the amount, reason, decision basis
  hashes and, when used, the AI draft metadata (accepted unchanged or edited).

## B. Seller settles inside PayPal (fast path)

- In the PayPal dispute panel, when PayPal offers the action:
  - **Accept claim** (`/v1/customer/disputes/{id}/accept-claim`): full refund handled by PayPal.
  - **Make offer** (`/v1/customer/disputes/{id}/make-offer`): `REFUND` with an amount, or
    `REFUND_WITH_RETURN`. The buyer accepts or declines in PayPal.
- Both need an in-page confirmation showing the amount and that it cannot be undone, run
  only if PayPal currently offers the action, and are recorded like the existing bridge
  actions (idempotent request id, failure with `debug_id`, simulated mode with `SIM-` cases).
- The deal stays `FROZEN_EXTERNAL` until PayPal resolves the case; the local state does not
  infer a refund (unchanged rule).

## Tests to add

Amount validation, capture-then-refund ordering and failure, idempotency on retry,
state transitions, audit payloads, simulated mode, and Sandbox probe steps for
accept-claim and make-offer.

## Original questions (answered 2026-10-22)

1. Approve A, B, both, or neither?
2. For A: should the default be "no return" for partial refunds? (Proposed: yes.)
3. Who sets the amount when the buyer and seller already agree? (Proposed: still the reviewer.)

Owner decision: A only; no return by default for partial refunds; the reviewer sets the amount.
