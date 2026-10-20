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

## How to run

```
npm install
npm test
npm run typecheck
npm run build
```

## Next steps

1. Review and merge `feat/orchestrator` after checks. The app scaffold remains separate
   from `main` and must be integrated in its own task.
2. Owner: finish remaining Sandbox tests (webhooks, dispute simulation, Platform app /
   Payouts), then record results in `docs/SANDBOX-NOTES.md`.
3. Connect the repository and orchestrator to app routes without importing Next.js into
   `src/lib/`.
4. A local smoke script that runs the real Sandbox flow (create order, open approval URL,
   authorize, void) using `.env`, so the client is verified end to end.
5. Webhook endpoint (signature verification, de-duplication, freeze on dispute/reversal).

## Decisions waiting for the owner

Decided on 2026-10-20: stack = Next.js + TypeScript + SQLite (Tailwind for UI), fund
model A (authorize then capture), license MIT, coding tools = Claude Code and Codex
(handoff through this file).

Tentative: AI inside the app = DeepSeek V4.1 Flash through the owner's Hive API key.
Verify the model name, API terms, strict-JSON reliability and image support first.

Still open:
- Who bears the fee on a refund.
- Time parameters (ship-by, inspection window, evidence deadline).
- Final public name (the word "Vault" suggests custody) and hosting.

## Do not forget

- Deadline: 13 Nov 2026, 03:00 WIB (12 Nov, 12:00 PM PT). Internal target: 11 Nov night.
- Everything for judges must be in English. Demo video under 3 minutes on YouTube.
- Never commit secrets. Sandbox only.
- Avoid forbidden claims listed in `AGENTS.md`.

## Log

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
