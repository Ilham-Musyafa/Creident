# Pending PayPal action reconciliation — proposal

Status: **proposal only, 2026-10-21. No implementation or state-machine decision is approved by this document.**

## The gap today

`applyTrigger()` claims a deterministic `PayPal-Request-Id` in the SQLite
`idempotency` table before the external call. On a normal response,
`saveTransition()` atomically stores the new transaction status, PayPal IDs, a
hash-chained audit event, and the successful claim. Tracking uses
`saveSideEffect()` in the same pattern. If the process stops after the claim but
before those writes, the claim remains `{ state: "pending" }`; subsequent calls
return `ACTION_PENDING`. This deliberately prevents an accidental second money
call, but there is no way to resolve the claim yet.

The current pending record stores no claim time, original trigger, original
status, request body, or decision reason. `getOrderStatus()` and
`getAuthorizationStatus()` return only status strings. A safe implementation
must first retain enough immutable intent to match a PayPal observation to the
exact local action. Do not infer success from an HTTP timeout, a webhook alone,
or an unrelated PayPal object.

## Proposed invariant and workflow — **owner approval required**

1. At claim time, persist the action kind, exact request id, transaction id,
   original transaction status/version, original trigger and inputs, target
   PayPal IDs, amount/currency, decision reason if applicable, claim time, and
   a digest of the outgoing request. Persist no access token or client secret.
   Add a way to list aged pending claims. Keep the pending claim as a lock while
   observations occur.
2. A reviewer opens a pending-action queue and requests a **read-only** PayPal
   check. Show local and remote status, matched resource IDs, amount/currency,
   request id, evidence source/time, and the proposed resolution. A stale or
   ambiguous observation remains pending. The reviewer can mark it for another
   check or request an explicitly guarded replay; the browser never supplies a
   new PayPal ID or a replacement amount.
3. If PayPal proves the action succeeded, apply the saved trigger's existing
   transition (or tracking side effect) with the observed IDs in one SQLite
   transaction: compare the original local status/version, change the claim to
   success, and append the ordinary action event plus a reconciliation event.
   Never issue the POST again in this case. If the local status changed, an
   external dispute is open, or the observation conflicts, stop for manual
   review instead of forcing a transition.
4. If PayPal proves the action did **not** execute, replay only under the
   conditions below, using the **same** `PayPal-Request-Id` and identical
   request body. Keep a single worker claim/lease so two reviewers cannot
   replay concurrently. If the POST or subsequent local commit is interrupted
   again, return to read-only reconciliation.
5. If neither outcome is provable, leave the action pending and block further
   conflicting money actions. Show the reviewer what evidence is missing.

This would change persistence, the orchestrator's pending path, reviewer access,
and possibly state transitions. **AGENTS.md requires the owner's approval
before implementation of state-machine or dispute-rule changes.** The owner
should also approve whether a reviewer may request any automatic replay of a
money call, the retention/age limits, and the required PayPal evidence. Until
then, this is a design proposal only.

## Read PayPal before deciding

| Pending action | Read-only source and match required | Gap or caution |
| --- | --- | --- |
| Create AUTHORIZE order | If an order ID was recorded elsewhere, GET `/v2/checkout/orders/{id}` and inspect intent, amount, payer-action link, and status. | A crash can occur before the order ID is saved. `getOrderStatus()` needs an ID and returns only a string. There is no verified lookup-by-request-id in this code. An unknown order cannot be declared absent just because SQLite has no ID. |
| Authorize order | Use the stored order ID; GET the full order and inspect `purchase_units[].payments.authorizations[]` for a matching authorization ID, amount, and status. If the ID is known, `getAuthorizationStatus()` can confirm its status. | Add a read-only full-order method; `getOrderStatus()` alone does not return the authorization ID. `ORDER_NOT_APPROVED` is a known Sandbox rejection, not proof that a different attempt succeeded. |
| Capture authorization | With a capture ID, `getCapture()` reads status and fee breakdown. Without it, inspect the full order's captures and, if PayPal exposes them, authorization links; match authorization, amount, and final-capture intent. | The current client has no capture search/list method. A missing local capture ID is not evidence that capture did not happen. |
| Void authorization | With the stored authorization ID, `getAuthorizationStatus()` can show `VOIDED`; also check whether a capture exists. | `PREVIOUSLY_CAPTURED` was observed in Sandbox for void after capture. Never turn a captured authorization into a local `VOIDED` status. A conflicting capture needs human investigation. |
| Refund capture | Read the capture and its refund resources, including refund ID, amount, currency, and status; GET the refund by ID once known. | The client has `getCapture()` but no refund read method, and the current transaction does not store a refund ID. A reduced refundable balance alone may not identify this refund. Confirm the Sandbox response shape before relying on it. |
| Add tracking after capture | GET the full order and inspect shipping trackers for the exact capture ID, tracking number, and carrier; match a tracker ID if provided. | The current client has `addTracking()` but no tracker read method. This is a side effect, not a transaction-status transition. |

New read-only client methods should return structured fields needed for matching;
do not infer success from the string `"COMPLETED"` on an order by itself. Validate
that every observed resource belongs to the same order, authorization, capture,
and amount before using it. If PayPal cannot expose enough detail, the reviewer
must compare the Sandbox merchant account's transaction details and record the
evidence reference; the app must not guess.

## Replay versus apply

- **Apply without resending:** PayPal shows the exact matching order,
  authorization, capture, void, refund, or tracker in the expected final state.
  Store observed IDs and the original outcome atomically. A completed capture
  must never be followed by another capture POST merely because SQLite still
  says `pending`.
- **Same-ID resend, only after verification:** PayPal's read APIs show no
  matching effect, the original request body is available and unchanged, no
  conflicting event or state change exists, and the specific endpoint's
  `PayPal-Request-Id` retention and replay behaviour have been confirmed for
  the elapsed time in Sandbox and current PayPal documentation. Preserve the
  same id and attempt number. A retry response still needs a final read/commit.
- **Keep pending:** The remote result is delayed, unavailable, inconsistent,
  incomplete, or outside the verified idempotency window. For a create-order
  call with no stored order ID, this may be the only safe automated result.
  Do not generate a new request id to bypass the lock.
- **Do not reinterpret errors:** The owner-tested Sandbox errors
  `ORDER_NOT_APPROVED` and `PREVIOUSLY_CAPTURED` describe specific rejected
  actions. They are not generic evidence that the pending action is safe to
  replay. Check current remote state first.

## Audit trail and reviewer surface — **owner approval required**

Proposed append-only event types: `RECONCILIATION_CHECKED` (read-only observation),
`RECONCILIATION_APPLIED` (remote success applied locally),
`RECONCILIATION_REPLAY_REQUESTED` (who approved a same-id replay and why), and
`RECONCILIATION_UNRESOLVED` (reason a claim remains blocked). Each event should
include transaction ID, action, request ID, observation time/source, relevant
PayPal resource IDs and statuses, the reviewer identity and reason, and the
PayPal `debug_id` where available. Never log credentials, access tokens, full
untrusted provider payloads, or personal payment data. The existing audit
chain must verify after every path.

Proposed UI: a reviewer-only pending queue and per-deal panel with a **Check
PayPal status** action, a clearly described proposed resolution, and a separate
confirmation for any replay. Show `ACTION_PENDING` to buyer/seller as a blocked
payment step with no retry button that can send money. The present `x-demo-role`
header/cookie is not authentication; reviewer reconciliation must not be
publicly exposed under demo-role checks alone. Approval is needed for the
permission model and any new endpoint or job trigger.

## Tests required before implementation is considered complete

1. With an in-memory DB and fake PayPal client, stop at every boundary:
   immediately after claim, during POST, after a successful PayPal response,
   and before/after SQLite commit. Restart and reconcile. Assert one remote
   money effect, one final status, one successful claim, and a valid audit chain.
2. For each action above, cover remote success with missing local result,
   proven non-execution, delayed/ambiguous read, mismatched amount/ID,
   external dispute, expired replay window, and a read failure. Ambiguous cases
   stay pending. Tracking reconciliation must not change transaction status.
3. Race two reviewers/reconciliation workers and a webhook against the same
   claim. Assert only one same-id replay or apply wins and all others see the
   resolved claim. Verify a stale observation cannot overwrite a newer status.
4. Test the reviewer UI/API permission and reason requirements, audit event
   contents, no credential leakage, and that buyer/seller cannot trigger a
   replay. Confirm the hash chain after success, failure, and unresolved checks.
5. Owner-run Sandbox tests with synthetic 10.00 USD transactions: interrupt
   each action before storing its response, then read the order, authorization,
   capture, void, refund, and tracker resources and compare the IDs/amounts.
   Repeat the **same** request id and identical body only where PayPal's current
   documented retention permits it; check immediate and near-expiry behaviour.
   Record whether the API exposes enough links to identify a refund or tracker
   and how a create-order response can be recovered without a saved order ID.
   Test approved and unapproved orders, capture then void (`PREVIOUSLY_CAPTURED`),
   and authorization before approval (`ORDER_NOT_APPROVED`). Record `debug_id`
   but no secrets in `docs/SANDBOX-NOTES.md`.

`docs/SANDBOX-NOTES.md` currently confirms the basic authorize, capture,
refund, and void paths and the two error issues above. It does **not** record
same-request-id replay behaviour, read-after-write consistency, recovery of a
lost order/refund/tracker ID, or real webhook delivery. Those gaps must be
tested before enabling automated reconciliation. No Live PayPal test is proposed.
