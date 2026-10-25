# Security review — updated 2026-10-25 (WIB)

## Current audit (2026-10-25)

See [the dated audit](SECURITY-AUDIT-2026-10-25.md) for scope, findings, fixes,
515 passing tests, local production probes, runtime sources and deployment limits.
Node 22.23.4 is now pinned; updating a PC does not update an existing Render service.
Ordinary payment effects now require confirmed statuses and cannot reserve a competing
money effect while another is pending. PayPalClient rejects every non-exact Sandbox
base URL, and malformed reviewer-code cookies fail the gate without throwing.
Demo roles/shared data, proxy-dependent rate limits, unbounded dataset growth, partial
CSP and manual payment reconciliation remain limits. The public service was not reached
from this environment, so this report does not certify its current configuration.

## Public demo on Render (2026-10-22)

Scope: hosting the demo publicly (render.yaml, docs/DEPLOY.md). Code review plus local
production-build checks; not a penetration test.

- **Fail-closed environment lock.** With `PUBLIC_DEMO=1` the server starts only when
  `PAYPAL_MODE=simulated` and `AI_MODE=replay`, and exits (code 1) if `PP_ID`, `PP_SECRET`,
  `AI_API_KEY` or `AUDIT_SIGNING_KEY` is set. A hosted demo therefore cannot reach the real
  PayPal Sandbox, a live model, or sign checkpoints. Checked by unit tests and by starting the
  production build with each unsafe variable.
- **Rate limit.** `src/proxy.ts` limits `/api/*` per client (first `X-Forwarded-For`
  address): 30 non-GET and 240 GET requests per minute, HTTP 429 with `Retry-After`. In
  memory, single instance, reset on restart; it blunts casual abuse, not a determined attacker
  (forwarded headers can be spoofed if the host does not overwrite them).
- **Security headers** on every response: `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'; base-uri 'self'; object-src 'none';
  form-action 'self'`, `Permissions-Policy`, HSTS; `X-Powered-By` removed. No `script-src`
  policy yet (inline theme script and Next.js runtime).
- **Data.** Demo data only; the free instance disk is wiped on restart and demo deals are
  reloaded at start. Visitors share one demo dataset and can change it until the next restart.
- **Roles.** Roles stay a demo switch (`x-demo-role`), not authentication. `REVIEWER_ACCESS_CODE`
  is left unset on the public demo so judges can try the reviewer flow; set it if abuse appears.

## C14: PayPal dispute bridge review

Scope: `origin/main` at `bf032bc`, plus `sec/c14-bridge-review`. Read the bridge
handlers, tick polling, gateway/client, repository, webhook integration, PDF builder,
shared role/body/error helpers and existing tests. This is code review and fake-client
verification, not a penetration test or a real Sandbox delivery test. No real
credentials were used; no new secret-history scan was run for C14. The earlier C2
history check below remains dated to its original scope.

### Endpoint controls checked

| Endpoint | Role / gate | Input and provider scope |
| --- | --- | --- |
| `POST /api/paypal/disputes/sync` | Reviewer; optional `REVIEWER_ACCESS_CODE` required when set | JSON object `{}` only; stored captured deals, bounded discovery/refresh policy below |
| `POST /api/jobs/tick` polling phase | Reviewer; same optional gate | Empty JSON object; same bounded polling service before normal deadline/tracking work |
| `POST /api/transactions/:id/paypal-dispute/evidence` | Seller or gated reviewer | Existing ID with 36-character hex/dash shape; optional nonempty `disputeId` <=200 characters, no extra fields; case must belong to this captured deal and mode |
| `POST /api/transactions/:id/paypal-dispute/escalate` | Seller or gated reviewer | Same ID/case checks; JSON boolean `confirm: true` required; PayPal must currently offer escalation |
| `POST /api/transactions/:id/paypal-dispute/simulate` | Buyer or gated reviewer | `{}` only; 404 outside simulated mode; completed/captured deal, `[Demo]` item, `terms.demo === true`, SIM/DEMO capture ID required; local gateway only |

- Role/gate checks run before bridge calls. All JSON bodies use the existing 16 KiB
  streamed byte limit, reject arrays/non-objects and unknown fields. Invalid/missing
  deal IDs produce 400/404; prepared SQL parameters prevent ID-based SQL injection.
- The server chooses the gateway and stored capture IDs, not caller-supplied URLs.
  The real client accepts the Sandbox host only. Capture filters and case paths are
  URL-encoded. Returned detail ID and seller capture ID must match before storing
  metadata or freezing. Simulated and real capture/case modes are kept separate.
- Fresh PayPal details control permitted evidence/message/escalation actions. The
  UI confirmation is backed by the server's boolean check; client visibility is not
  the permission check. No accept-claim, make-offer or refund action was added.

### Polling limits and continuation

- Fixed medium resource-exhaustion risk: sync/tick previously listed every captured
  deal and refreshed an unbounded number of details on every call.
- `PAYPAL_DISPUTE_WINDOW_DAYS = 180` limits **new discovery**, including the exact
  cutoff. Use the recorded successful capture timestamp for the stored capture ID;
  legacy/seeded rows without it fall back to TRANSACTION_CREATED, then DB created_at.
  Later updates, freeze/resume and old resolved cases do not restart the window.
  Legacy fallback can understate a missing recent capture's window; reconcile such
  imported history manually. The 180-day policy is not a promise about every PayPal
  category or regional rule.
- `PAYPAL_DISPUTE_MAX_POLL_CALLS = 50` caps combined logical `listDisputes` and
  `getDispute` calls per invocation, including failed reads. This is a **dispute-read
  budget**, not a whole-request HTTP budget: OAuth acquisition/refresh, action sends,
  and tick's normal money/tracking operations are outside it. Fifty reads permits
  up to 25 discovery list/detail pairs when each capture has one case.
- Known open cases bypass age filtering and are refreshed first, including IDs
  mapped from verified CREATED webhooks. Stored resolved cases do not need refresh.
  Owner chose a hard cap: open cases beyond the budget wait for the next run.
  Attempt sequence in the existing-DB-safe `paypal_dispute_poll_attempts` table
  rotates case/capture reads across restarts and failures, separately per mode.
  Failed refreshes do not fake updated case metadata or mark a case resolved.
- API result rows expose `deferred: true` when work was left for later. A persistent
  open backlog can consume all reads and delay discovery. Explicit repeated sync/tick
  calls are needed; this does not add a worker or a global/per-user rate limit.

### Idempotency and audit checks

- Evidence/message sends reserve `hv-dispute-<SHA-256(canonical JSON)>` in the existing
  unique `idempotency` table before the remote call. The digest covers case/action
  and the terms/evidence/tracking/decision manifest. Escalation uses case/action only,
  so evidence changes cannot trigger another escalation. Repeated successful claims
  do not send again; failed/interrupted claims remain pending for manual checking.
- These are local PayPal-Request-Id-style reservation keys. The current Disputes API
  client methods do **not** send them as a `PayPal-Request-Id` header, and this review
  does not claim remote exactly-once delivery. Automatic reconciliation is not built.
- `PAYPAL_DISPUTE_DETECTED` is written once per stored case. Freeze/resume updates and
  audit writes commit together; verified webhook de-duplication and sticky resolution
  avoid duplicate transitions. Other known open cases keep the deal frozen.
- Successful sends write EVIDENCE_SENT / MESSAGE_SENT / ESCALATED with case ID,
  action, terms/evidence/PDF hashes and audit head. Validation/read/send failures
  write ACTION_FAILED with code, issue and debug_id as available. Simulated bridge
  events are labelled. Operational polling attempt order is separate from the audit.
- Error responses omit PayPal descriptions, OAuth tokens, client secrets and stack
  traces. PayPal errors return issue/name and debug_id; unexpected failures return
  generic INTERNAL_ERROR. Audit failures also omit exception message/provider body.
  Tests use a throwaway marker to confirm unexpected error text and token data do
  not enter either the response or failure audit events.

### Evidence PDF as data

- Submission verifies the locked terms hash, current evidence against every audited
  EVIDENCE_SUBMITTED record (ID/actor/kind/content hash/count), and the audit chain.
  An altered terms/evidence basis or invalid chain blocks sending.
- `textPdf()` renders printable ASCII in PDF literal strings. Parentheses and
  backslashes are escaped **after** wrapping. PDF-like `/OpenAction`, JavaScript
  text and `endstream` inside evidence stay string data, not executable operators.
  Hashes cover original UTF-8 content. No HTML renderer, URL fetch, shell command,
  AI tool or arbitrary file path is invoked by document creation.
- Multipart filename/type are server constants; evidence is never used as a file
  path. It is a one-page text document, not original photo uploads. Large aggregates
  can make the font very small; the prototype has no aggregate evidence quota.

### Findings and remaining risks

| Severity | Finding | Status |
| --- | --- | --- |
| Medium | Unbounded dispute polling could produce increasing outbound reads and work for every captured deal. | Fixed with 180-day discovery, 50-read hard cap, open-case priority and persistent rotation; regression tests added. |
| High if publicly exposed | Demo roles are caller-selected and do not prove party identity/ownership. Sellers do not need the reviewer code, and the code is only a reviewer demo gate. | Existing prototype limitation; real authentication, transaction ownership authorization and request rate limits are still required for a public service. |
| Operational | The cap is per invocation, not across concurrent/repeated requests; a saturated open queue delays discovery. | Documented. Re-run sync/tick; no global scheduler or rate limiter was added. |
| Operational | Remote sends can succeed while the local process fails before recording success. | Existing pending/manual-check policy; no blind resend or automatic reconciliation. |
| Low / resource limit | Evidence count/aggregate PDF size has no transaction-wide quota; fitting one page can produce tiny text. | Remaining prototype limit; per-request input sizes do not bound lifetime aggregate evidence. |
| Informational | `npm audit --json` reported 0 vulnerabilities (all severities) for the installed lockfile. | No updates, forced upgrades, dependencies or lockfile changes needed. |

### C14 verification

- In-memory polling tests: capture-date versus update/creation age, 180-day boundary,
  legacy fallback, old open/resolved cases, verified-webhook-only case, mode isolation,
  list+detail combined hard cap, large/duplicate lists, priority, persisted rotation,
  fixed clocks and failed reads.
- Route tests: reviewer gate on sync/tick/evidence/escalate/simulate, role/input/body
  limits, confirmation, safe errors/audit, literal PDF text, send idempotency and
  poll/webhook freeze/resume. The existing bridge suite remains in use.
- `npm test`, `npm run typecheck`, `npm run build`: passed (final counts in HANDOFF).
- Integrated real Sandbox bridge and real webhook delivery remain pending for the
  owner. The separate successful client probe does not establish those paths.

## Earlier C2 review (2026-10-21)

Scope: the prototype at `origin/main` as of `6fa2452`, plus the fixes on
`codex/c2-security`. This review is a code and dependency check, not a penetration
test. No live PayPal credentials or production deployment were used.

## Checks performed

- Searched all 235 Git blobs reachable from the full local Git history for committed
  `.env` files, private-key headers, common token prefixes, and nonempty PayPal/AI
  credential assignments. **No suspected committed secret was found.** No credential
  values were printed during the scan. This pattern scan cannot prove the absence of
  every possible secret format.
- Ran `npm audit --json`: 0 reported vulnerabilities at every severity. No dependency
  update was needed.
- Read all `src/app/api/**` handlers and shared code for role checks, input shapes,
  text lengths, request sizes, and error responses. The ordinary endpoints check
  `x-demo-role` against permitted actions; the PayPal return handler also accepts its
  demo role from the callback query. User text has per-field limits, JSON actions reject
  unknown fields, and unexpected exceptions return a generic 500 response. PayPal
  errors expose the provider issue and debug ID, not credentials or access tokens.
- Reviewed the webhook path and repository: a webhook is verified through PayPal's
  signature verification API before any event reaches the repository. Only a
  `SUCCESS` response is accepted. The verified event ID is de-duplicated by a unique
  database key inside a transaction; duplicate delivery changes neither transaction
  state nor audit history. Tests cover invalid signatures, duplicates, freeze, resume,
  and oversized bodies. Real webhook delivery remains untested.
- Searched UI rendering for HTML insertion. Item, terms, evidence, and other stored
  text are rendered as React text, not HTML. The sole `dangerouslySetInnerHTML` use is
  a constant theme setup script in `src/app/layout.tsx`, with no user data. Evidence
  sent to the AI is serialized as JSON inside an untrusted-data wrapper, names are
  masked, and the provider is given no tools. The response has strict schema checks.

## Findings by severity

| Severity | Finding | Resolution |
| --- | --- | --- |
| High if publicly exposed | Demo roles are caller-selected headers or cookies, not identity verification. Anyone who can reach the demo API can act as buyer, seller, or reviewer, including payment actions when Sandbox keys are configured. | Open by design for this local Sandbox prototype. Add real authentication, transaction ownership checks, and a protected job trigger before public deployment. Restrict network access to the demo meanwhile. |
| Medium | API and webhook handlers checked body length only after `request.text()` had buffered the entire body. A large chunked request could consume excessive memory. | Fixed: stream-limit JSON requests to 16 KiB and webhook requests to 1 MiB, with tests for chunked bodies, byte counting, early cancellation, and pre-verification rejection. |
| Medium | Evidence text could contain `</untrusted_data>` and visually end the AI prompt's quoted-data wrapper. | Fixed: escape opening angle brackets within serialized JSON and flag wrapper-tag attempts. A regression test confirms the text remains inside parseable quoted data. |
| Informational | `npm audit` reported no vulnerable dependencies; the history pattern scan found no suspected committed secrets. | No package or history change. |

## Remaining work

- The demo role mechanism must not be treated as authentication. In particular,
  `POST /api/jobs/tick` and reviewer decisions need authenticated, authorized callers
  in any public deployment.
- Test the webhook with real Sandbox delivery to a public HTTPS endpoint, as noted in
  `docs/SANDBOX-NOTES.md`. The fake verification tests do not establish live delivery.
- The AI wrapper and injection heuristic reduce obvious prompt confusion but cannot
  guarantee that a model will ignore every malicious instruction. Human review remains
  required for dispute outcomes.

No new dependencies were added. The two code fixes have separate commits and regression
tests. Verification on this branch: `npm test`, `npm run typecheck`, and `npm run build`.
