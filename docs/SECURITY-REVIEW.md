# Security review — 2026-10-21

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
