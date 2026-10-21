# Sandbox notes

Results of hands-on tests against the **PayPal Sandbox** (`https://api-m.sandbox.paypal.com`).
Date: 2026-10-20. Tested by the owner with PowerShell, using a Merchant-type sandbox app and
the default Business + Personal sandbox accounts. No secrets are recorded here.

Sandbox figures (fees, behaviour) are not guaranteed to match production.

## Test results

| Test | Result |
| --- | --- |
| Developer account created from Indonesia | Works |
| OAuth token (`POST /v1/oauth2/token`, client credentials) | Works |
| Create order with `intent: AUTHORIZE` (`POST /v2/checkout/orders`) | Works, status `PAYER_ACTION_REQUIRED`, link `rel: payer-action` |
| Buyer approval in the browser (sandbox Personal account, "Selesaikan Pembelian") | Works, redirects to `return_url` |
| Authorize order (`POST /v2/checkout/orders/{id}/authorize`) | Works, order `COMPLETED`, authorization `CREATED` |
| Capture (`POST /v2/payments/authorizations/{id}/capture`, `final_capture: true`) | Works, `COMPLETED` |
| Refund full (`POST /v2/payments/captures/{id}/refund`) | Works, `COMPLETED`; refund went to the buyer's PayPal balance |
| Void before capture (`POST /v2/payments/authorizations/{id}/void`) | Works, authorization status `VOIDED` |
| Void after capture | Rejected: `UNPROCESSABLE_ENTITY` / `PREVIOUSLY_CAPTURED` |
| Authorize before the buyer approved | Rejected: `UNPROCESSABLE_ENTITY` / `ORDER_NOT_APPROVED` |
| Use a wrong/placeholder authorization id | Rejected: `RESOURCE_NOT_FOUND` / `INVALID_RESOURCE_ID` |

## App client run (`npm run smoke`, 2026-10-21)

Run by the owner on Windows against the Sandbox with the project's own `PayPalClient`
(the same client the app uses), each money call with its own `PayPal-Request-Id`. No
secrets recorded.

| Path | Result |
| --- | --- |
| Create AUTHORIZE order, buyer approval with a Sandbox Personal account | `PAYER_ACTION_REQUIRED`, then `APPROVED` |
| Authorize | Authorization `CREATED` |
| **b)** Capture | `COMPLETED`; fee breakdown gross 10.00, fee 0.64, net 9.36 USD |
| **b)** Add tracking after capture (`POST /v2/checkout/orders/{id}/track`, carrier `OTHER`, made-up tracking number) | Accepted; tracker id returned (`<captureId>-<trackingNumber>`) |
| **b)** Full refund | `COMPLETED` |
| **a)** Void (new order) | Authorization `VOIDED` (confirmed by a read) |

Learned: approving with the Sandbox **Business** account fails ("you are logged in to the
seller account"); the buyer must use the Personal account. On Windows, run `npm.cmd`
when PowerShell blocks `npm.ps1`.

## Disputes API probe (`npm run dispute-probe`, pending owner run)

Docs (checked 2026-10-21): creating a dispute through the API needs the `DISPUTE_CREATE`
scope from a PayPal account manager, so the buyer opens it by hand in the Sandbox
Resolution Center. Merchant calls (list, show, provide-evidence, send-message) and the
Sandbox-only simulations `require-evidence` and `adjudicate` should work with the app's own
token. The docs disagree on the provide-evidence body (multipart file vs JSON); the probe
tries a PDF as multipart first, then JSON notes, and prints which one PayPal accepted.

First owner run (2026-10-21): the buyer opened dispute `PP-R-OIU-10193936` (SNAD) in the
Sandbox Resolution Center. Listing and reading disputes with the app's own token **works**
(it appeared after about 3 minutes, status `UNDER_REVIEW`, stage `INQUIRY`). PayPal offered
no actions yet and refused evidence in both formats with `ACTION_NOT_ALLOWED_IN_CURRENT_DISPUTE_STATE`
(422): evidence is not accepted in the inquiry stage. Next: `npm run dispute-probe -- <id>`
tries the Sandbox require-evidence move, or the buyer escalates the case to PayPal.

Second run, a few minutes later: status `WAITING_FOR_SELLER_RESPONSE`, still `INQUIRY`, and
PayPal now offers the seller `accept_claim`, `send_message`, `escalate` and `make_offer`.
The Sandbox `require-evidence` move is refused in the inquiry stage (400
`ACTION_NOT_ALLOWED_IN_CURRENT_DISPUTE_STATE`) and evidence is still refused. The seller can
escalate the inquiry to a claim itself; the probe now does that before sending evidence.

## Fees seen in the Sandbox (10.00 USD sale)

- Capture: gross 10.00, PayPal fee 0.64, net 9.36 (`seller_receivable_breakdown`).
- Refund (`seller_payable_breakdown`): gross 10.00, fee 0.00, net 10.00. This suggests the
  original 0.64 fee is **not** returned on refund (the merchant bears it). The tail of the
  `total_refunded_amount` field was cut off in the output, so treat this as likely, not
  confirmed.
- Design consequence: the UI must show fees before payment, and the dispute rules must say
  who bears the fee on a refund.

## Error shape

PayPal errors look like:

```
{ "name": "UNPROCESSABLE_ENTITY",
  "message": "...",
  "debug_id": "...",
  "details": [ { "issue": "PREVIOUSLY_CAPTURED", "description": "..." } ] }
```

Use `details[].issue` as the machine-readable code and store `debug_id` in the audit log.

## Behaviour that shapes the state machine

- The buyer must approve the order before authorize can be called.
- Once captured, an authorization cannot be voided. The only way back is a refund.
- A new order needs a new `PayPal-Request-Id`.
- Every money-moving call should send its own unique `PayPal-Request-Id`.

## Not tested yet (as of 2026-10-20)

- Webhooks (which events arrive for authorize/capture/refund/void).
- The new webhook handler's signature verification, dispute freeze, and resume paths
  have only been tested with fake PayPal verification responses. The owner still needs
  to test real Sandbox webhook delivery; PayPal needs a public HTTPS callback URL and
  the matching `PP_WEBHOOK_ID` from the Sandbox app.
- Disputes (can a dispute be simulated on a sandbox transaction?).
- A `Platform`-type app, delayed disbursement, multiparty, Payouts (may need partner
  approval).
- Re-authorization, expiry of authorization (29 days), partial capture, partial refund.
- Currency: IDR is not in PayPal's REST API currency list, so the demo uses USD
  (documented by PayPal, not tested here).

## From PayPal documentation (read, not tested)

- Authorization is valid up to 29 days. Honor period is 3 days, with the best capture
  success. After that capture depends on risk assessment and funds availability.
- Refund is allowed within 180 days of the capture.
- PayPal's Acceptable Use Policy lists escrow services and marketplaces as requiring
  pre-approval. This is why the project is framed as a prototype and why the production
  path would be a licensed partner.
