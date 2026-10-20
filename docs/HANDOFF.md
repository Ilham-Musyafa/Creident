# HANDOFF.md

Shared notes so any agent (Claude, Codex, others) can continue the work.
Update this file at the end of every session and before usage limits run out.
Keep it short and current. Newest entry first in the log.

## How to resume

1. Read `AGENTS.md`, `docs/DESIGN.md`, `docs/SANDBOX-NOTES.md`, then this file.
2. Check `git status` and the open pull requests.
3. Pick the first item under "Next steps" unless the owner says otherwise.
4. Work on a new branch. Do not push to `main`.

## Current status (2026-10-20)

Project locked by the owner on 2026-10-20: dispute-mediation prototype for the PayPal AI
Hackathon, working name HalcyVault, narrow scope (see `docs/DESIGN.md`).

Done:
- Registered on Devpost as a solo entrant; PayPal Developer account and a Merchant-type
  Sandbox app created; Business and Personal sandbox accounts exist.
- Sandbox tests passed: token, order AUTHORIZE, buyer approval, authorize, capture,
  refund, void before capture. Error cases captured. Details in `docs/SANDBOX-NOTES.md`.
- Official rules read (deadline, eligibility, requirements, judging criteria).
- Design draft v0.1 written.
- Core domain built on branch `feat/core-domain` (pure TypeScript, no UI, no database yet):
  - `src/lib/domain/` state machine (`transition(tx, trigger)` returns the next state and
    the PayPal effect the caller must perform before committing).
  - `src/lib/audit/chain.ts` hash-chained audit log with `appendEvent` and `verifyChain`.
  - `src/lib/rules/engine.ts` rules R1-R7 (`decide(input)`), deterministic, with reasons.
  - `src/lib/paypal/client.ts` fetch-based PayPal client (token, AUTHORIZE order,
    authorize, capture, void, refund, capture fee breakdown) with `PayPal-Request-Id`.
  - 55 unit tests pass (`npm test`), `npm run typecheck` passes. The PayPal client is only
    tested with a fake fetch; it has not been run against the real Sandbox yet.
- Dev dependencies only: typescript, vitest, @types/node.
- On `feat/orchestrator`: SQLite schema and repository, audit sequence numbers per
  transaction, and `applyTrigger()` connecting the state machine to the PayPal client.
  Request ids are claimed before calls; success or PayPal failure is recorded with an
  audit event. Interrupted calls remain pending for reconciliation instead of being
  sent twice. No UI, live PayPal calls, or new dependencies were added.
- On `feat/api-routes`: the orchestrator is integrated into Next.js App Router JSON
  handlers. Demo buyer/seller/reviewer users are seeded in SQLite; `x-demo-role` (or
  `role=buyer` on PayPal return) declares the actor and each route checks its allowed
  role. Routes cover transaction creation, two-party terms acceptance, payment and
  return, simulated tracking, receipt confirmation, dispute/evidence, human review,
  audit logs/verification, and deadline tick. No UI pages or real authentication.
  Handler tests use an in-memory database and fake PayPal fetch. Live route calls
  against the PayPal Sandbox remain to be tested by the owner.
- On `feat/ai-evidence`: provider-neutral evidence summarization feeds the existing
  `AiSummary` type, with an OpenAI-compatible fetch adapter, strict schema and reference
  checks, one retry for invalid output, name masking, seeded evidence order, a simple
  injection flag, and exact-case JSON replay by default without an API key. It has no
  tools or transaction write path. The branch includes orchestrator and API commits
  because `origin/main` still lacks a build script. No live AI provider was called.
- On `feat/eval`: `npm run eval` reads 40 synthetic dispute cases (18 buyer-right,
  18 seller-right, 4 unclear) and 10 injection cases, generates six presentation
  variants each, repeats base cases with configurable `EVAL_K`, and writes
  `eval/report.md`. Replay summaries were authored from draft labels, so the replay
  report checks the harness and rules, not live model quality. All 50 labels need
  owner review. This branch includes the orchestrator, API, and AI prerequisite commits.
- On `feat/paypal-webhook`: `POST /api/webhooks/paypal` asks PayPal to verify every
  signature, rejects failures, and de-duplicates verified event ids in SQLite.
  Recognized dispute/reversal events freeze the matched transaction, including a
  completed capture; resolution restores the prior status. Other matched events are
  audit-only. The new branch includes the orchestrator and API route commits because
  `origin/main` still contains only the core domain. Tests use fake PayPal responses.

## How to run

```
npm install
npm test
npm run typecheck
npm run build
```

## Next steps

1. Review `feat/api-routes` alongside `feat/orchestrator`. The API branch includes the
   orchestrator commit because `main` did not yet contain it. The separate UI scaffold
   branch was not integrated; this task adds the required Next.js runtime without pages.
2. Owner: finish remaining Sandbox tests (webhooks, dispute simulation, Platform app /
   Payouts), then record results in `docs/SANDBOX-NOTES.md`.
3. Add the PayPal webhook endpoint with signature verification, event-id de-duplication,
   and external dispute/reversal freeze. This remains separate from the role-based demo
   requests because PayPal sends the webhook.
3. Owner: configure a public HTTPS callback URL and matching Sandbox `PP_WEBHOOK_ID`,
   then test real webhook delivery and payload mapping. The webhook is separate from
   role-based demo requests because PayPal sends it.
4. Run the local Sandbox smoke script on the owner's PC and test the JSON routes against
   the real Sandbox; fake fetch tests do not verify network or account configuration.
5. Add UI pages in their own task and replace declared demo roles with authentication
   before any deployment beyond the controlled demo.
6. Wire the evidence summarizer into review preparation, keeping the rules and human
   confirmation as the only path to a decision. Test the chosen provider's strict JSON
   behaviour and terms before using it outside the replay cases.
7. Owner: review every evaluation label and rationale before treating any live-run
   metric as evidence. Expand the set toward the larger sample proposed in DESIGN 10.

## Decisions waiting for the owner

Decided on 2026-10-20: stack = Next.js + TypeScript + SQLite (Tailwind for UI), fund
model A (authorize then capture), license MIT, coding tools = Claude Code and Codex
(handoff through this file).

Tentative: AI inside the app = DeepSeek V4.1 Flash through the owner's Hive API key.
Verify the model name, API terms, strict-JSON reliability and image support first.

Still open:
- Who bears the fee on a refund.
- Final time parameters (temporary defaults: ship-by 3 days, inspection 2 days,
  evidence 2 days; configurable via environment variables).
- Final public name (the word "Vault" suggests custody) and hosting.

## Do not forget

- Deadline: 13 Nov 2026, 03:00 WIB (12 Nov, 12:00 PM PT). Internal target: 11 Nov night.
- Everything for judges must be in English. Demo video under 3 minutes on YouTube.
- Never commit secrets. Sandbox only.
- Avoid forbidden claims listed in `AGENTS.md`.

## Log

- 2026-10-20 (Codex): added the synthetic evaluation harness on `feat/eval`, with
  draft balanced labels, generated counterfactuals, replay/live execution, and an
  indicative report. The first replay run exposed a missed forged role delimiter;
  its detector and regression test were fixed. `npm run eval`, `npm test` (80 passed),
  `npm run typecheck`, and `npm run build` passed. No new dependencies or live AI calls.
- 2026-10-20 (Codex): added the AI evidence-summary module on `feat/ai-evidence` with
  fake-provider and replay tests. No new dependencies or live AI calls. `npm test`
  passed 76 tests, and `npm run typecheck` and `npm run build` passed.
- 2026-10-20 (Codex): added the signed PayPal webhook route on `feat/paypal-webhook`,
  including verified de-duplication, audit events, freeze/resume, and handling of
  capture reversals after completion. `npm test` passed 73 tests, and
  `npm run typecheck` and `npm run build` passed. Real webhook delivery is pending.
- 2026-10-20 (Codex): implemented and tested the JSON API on `feat/api-routes`, with
  demo roles, fixed simulated courier data, configurable placeholder deadlines, and
  direct handler tests. `npm test` passed 68 tests, and `npm run typecheck` and
  `npm run build` passed. No live PayPal calls were made.
- 2026-10-20 (Codex): implemented SQLite persistence and the PayPal orchestrator on
  `feat/orchestrator`, with in-memory tests and no live credentials.
- 2026-10-20 22:30 WIB (Claude): built the core domain on `feat/core-domain`
  (state machine, audit chain, rules, PayPal client, 55 tests). Not pushed anywhere yet;
  the repo exists only as a local git repository delivered to the owner as a zip.
- 2026-10-20 (Claude, later): recorded owner decisions (model A, MIT, stack, tentative
  AI provider), added `LICENSE` (MIT). Still not committed to any repo.
- 2026-10-20 (Claude): drafted `AGENTS.md`, `CLAUDE.md`, `docs/DESIGN.md`,
  `docs/SANDBOX-NOTES.md`, this file, `.env.example`, `.gitignore`, README stub.
  Not yet committed to any repo.

---

Ringkasan singkat (Bahasa Indonesia, untuk Ilham): proyek terkunci, uji Sandbox
authorize/capture/refund/void lolos, dan inti logika sudah dibangun dengan 55 uji yang
lolos (belum ada tampilan dan database). Langkah berikutnya: buat repo publik dan
unggah, lalu kerangka Next.js, database SQLite, dan penghubung antara logika dan PayPal.
