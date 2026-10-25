# Creident security audit — 2026-10-25

## Scope and conclusion

Owner requested a broad audit after concerns about PHP and Node.js vulnerabilities.
Baseline: `origin/main` at `9a1acd1` (Records PR #86 merged). Work branch:
`security/demo-audit`. This is a repository/configuration review, dependency advisory
check and local production verification, not an independent penetration test or a
certification. No live payment, provider credential, private evidence or deployed
customer data was used.

**Suitable only for a labelled, shared-data simulation after applying the fixes and
checking the hosting runtime. Not ready for real users' private data or payments.**
No PHP source or Composer manifest was found in tracked project files. PHP advisories
do not directly describe this application's runtime. The owner did not identify a
specific advisory/CVE, so this audit does not assert coverage of a particular report.

## Findings

| ID | Severity / conditions | Finding | Resolution |
| --- | --- | --- | --- |
| SEC-01 | High operational priority; exact exploitability depends on affected Node features | `engines.node >=22.13.0` admitted old runtimes; Render selected only major `22`. A past owner screenshot showed 22.23.3, but current Render runtime is unverified. `npm audit` does not scan Node itself. | Official release feeds identify 22.23.4 and 24.22.1 as security releases. Require `^22.23.4 || ^24.22.1`; pin 22.23.4 in `.node-version` and Blueprint. Tests/build ran on the official 22.23.4 binary after SHA-256 comparison with official checksums. Owner must update/check any dashboard override and redeploy. |
| SEC-02 | High in connected Sandbox payment flows; public simulated demo has no financial exposure | Ordinary authorization/capture/full-refund orchestration trusted provider IDs/HTTP success without requiring confirmed provider status. A pending/denied response could become a completed local state. | Require authorization CREATED and capture/refund COMPLETED with IDs. Otherwise leave the durable action pending and return a safe manual-verification error. No repeated provider send on retry. Partial refunds already checked status. |
| SEC-03 | High in connected Sandbox payment flows | Idempotency reserved each effect separately, allowing competing capture/void calls against the same deal. Local conditional updates cannot undo two remote sends. | Atomically reject a new money reservation while another money effect for the transaction is pending, in the existing BEGIN IMMEDIATE transaction. Regression test holds capture in flight and proves void is never called. No schema or dispute-rule change. |
| SEC-04 | Medium defense in depth; configuration, not caller-controlled input | API context checked the Sandbox URL, but direct PayPalClient construction allowed other URLs; simulation guard used prefix matching. | Constructor now accepts only exact `https://api-m.sandbox.paypal.com`; reject Live, HTTP, lookalike, userinfo and path variants before sending credentials. Existing probe test now expects earlier rejection. |
| SEC-05 | Low robustness | Malformed percent encoding in reviewer-code cookie raised URIError and returned generic 500. It did not grant access. | Treat invalid encoding as absent code; configured reviewer gate rejects it normally. Regression test and local HTTP probe passed. |
| SEC-06 | High if used beyond shared simulation; existing design limit | Caller-selected demo roles do not authenticate users or authorize transaction ownership. Ungated reviewer mode intentionally permits judges to act as reviewer. Audit pages/data are shared. | Open prototype limitation. Do not put private data/provider keys on public demo. Production needs real identity, ownership authorization and protected background jobs; not added during this audit. |
| SEC-07 | Medium availability; existing limit | In-memory per-IP limits reset on restart, are not shared across instances, and trust forwarded headers. Global transaction/evidence/audit growth is unbounded; audit list/verification work scales with the dataset. | Existing 16 KiB JSON / 1 MiB webhook limits and API rate limiter remain. Production needs trusted-proxy configuration, durable/global budgets, quotas, retention and bounded/paginated verification. No claim of DDoS protection. |
| SEC-08 | Medium operational; existing limit | Provider action may succeed remotely while local commit fails, including during an external-dispute race. There is no automatic reconciliation. Failures/pending results require checking. | Durable reservations prevent blind same-effect retries; new competing-pending guard adds protection. Real Sandbox reconciliation/freeze timing still needs integrated verification. Never infer a completed payment from a pending action. |
| SEC-09 | Low defense in depth; existing limit | CSP has frame/base/object/form restrictions but no script-src policy. | React escapes user text; only constant theme script uses dangerouslySetInnerHTML. A nonce-based strict CSP needs separate tested work. Current headers do not establish complete XSS prevention. |

## Review coverage

- Read shared HTTP/context/action handlers, dispute bridge, individual AI/reviewer routes,
  public-demo startup/instrumentation, proxy, configuration and existing security notes.
- Reviewed payment orchestrator, partial refund stages, durable reservations, conditional
  SQLite transitions, external freeze, rules/review pipeline, audit chain/checkpoints,
  CSV/PDF exports and provider boundaries. No state-machine/rule/deadline changes.
- API mutations require allowed demo role before provider work. Reviewer code is checked
  server-side when configured, using hashed constant-time comparison. A reviewer code
  remains a demo gate, not identity verification or protection for Buyer/Seller data.
- JSON inputs are streamed with a byte limit and field validation. SQL uses bound values;
  the dynamic deadline column is an internal finite union, not request text. Shell/file
  searches found no request-driven command execution or user-controlled filesystem path.
- Webhook signature verification is delegated to PayPal and must return SUCCESS before
  repository processing; verified IDs are deduplicated. Public demo has no PayPal keys.
- AI inputs are serialized/escaped quoted data, outputs validated, no provider tools;
  human confirmation remains required for dispute outcomes. Prompt-injection heuristics
  do not guarantee a live model's behavior. Public deployment uses replay only.
- CSV cells neutralize formula prefixes; PDF strings escape metacharacters and do not
  execute HTML/JavaScript. No real photo upload or image decoder endpoint is implemented.
- UI sink search found only the constant theme script using HTML insertion. React text
  rendering is used for user evidence/items; no claim of exhaustive browser exploit testing.
- `npm audit --json` after clean install: **0 known vulnerabilities** across all severities
  for this lockfile, including dev dependencies. Packages remain pinned; no dependency
  upgrades/additions or forced audit fixes were needed. An advisory lookup is a snapshot,
  not proof of absence of unpublished vulnerabilities or malicious package behavior.
- Scanned **1,233 reachable Git blobs** for common private-key/token patterns, without
  printing values. Three hits were regex literals in historical checkpoint tests; each
  generates ephemeral keys and contains no complete private-key block. No confirmed
  secret in this scan. Pattern coverage is limited; credentials/dashboard/env values
  were not read. Only `.env.example` and `next-env.d.ts` are tracked env-named files.

## Verification

Runtime: Node **22.23.4** on Linux, downloaded from nodejs.org. Initial managed runtime
was 24.19.0 and was not used for final verification. Node 24.22.1 is an allowed patched
LTS alternative but was not tested in this run.

- Clean `npm ci`: passed using a writable temporary npm cache. First attempt failed
  because the default cache path was not writable; retry succeeded without bypassing
  package integrity checks, changing package versions or weakening TLS.
- `npm test`: **515 passed, 48 files** (baseline 497; 18 new regression cases).
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Fresh local production server with PUBLIC_DEMO=1, simulated payments, replay AI and
  synthetic optional reviewer code: seeded 13 deals, all 13 audit chains verified.
- HTTP checks: security headers present, X-Powered-By absent; missing role/code and
  malformed cookie rejected; synthetic correct code accepted; 31st invalid write in
  one minute returns 429 + Retry-After without mutating data.
- Production startup rejects Sandbox mode, live AI mode and a synthetic provider secret.
- Existing tests cover bounded/chunked bodies, invalid webhooks/deduplication, AI schema/
  injection handling, CSV/PDF escaping, partial-refund pending outcomes and freeze.

**Not verified:** the owner's PC installation, active Render Node version/environment,
public site's current headers, OS/container packages, real Sandbox webhooks/provider
responses, live AI or an external penetration test. A read-only HTTPS request to Render
was blocked by this execution environment's network proxy (CONNECT 403); this is not
an application failure. No destructive or intrusive probe was sent to the public site.

## Owner actions before recording

1. Review/merge this branch; existing Render dashboard `NODE_VERSION` overrides the
   Blueprint if independently configured. Set **22.23.4**, redeploy, and confirm that
   exact version in the new build log. Existing running instances do not update when
   Node is updated on a PC or when a major-only pin changes upstream.
2. Keep PUBLIC_DEMO=1, PAYPAL_MODE=simulated, AI_MODE=replay, no provider/signing secrets
   and only synthetic data. Do not post environment secret values in chat.
3. Run the planned demo scenario once after deployment. If abuse appears, configure
   the optional reviewer code and keep it ready for recording; it is not a replacement
   for production authentication. No new sign-in feature is required for the video.
4. PC: `node --version` should report patched 22.23.4+ within 22 LTS or 24.22.1+ within
   24 LTS. Restart terminals/processes after updating. Recheck official releases over
   time; these minimums are a dated security baseline, not permanent safety claims.

## Sources (checked 2026-10-25)

- https://nodejs.org/dist/index.json
- https://nodejs.org/dist/v22.23.4/SHASUMS256.txt
- https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V22.md
- https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V24.md
- npm registry audit endpoint through `npm audit --json` for the exact project lockfile.
