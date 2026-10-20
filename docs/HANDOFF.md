# HANDOFF.md

Shared notes so any agent (Claude, Codex, others) can continue the work.
Update this file at the end of every session and before usage limits run out.
Keep it short and current. Newest entry first in the log.

## How to resume

1. Read `AGENTS.md`, `docs/DESIGN.md`, `docs/SANDBOX-NOTES.md`, then this file.
2. Check `git status` and the open pull requests.
3. Pick the first item under "Next steps" unless the owner says otherwise.
4. Work on a new branch **created from the latest `main`** (`git fetch` first). Do not push
   to `main`.

## Current status (2026-10-20)

Project locked by the owner on 2026-10-20: dispute-mediation prototype for the PayPal AI
Hackathon, working name HalcyVault, narrow scope (see `docs/DESIGN.md`).
Repo: `Ilham-Musyafa/HalcyVault` (private during development; must be made public before
submission and stay public until 15 Dec 2026).

Done:
- Registered on Devpost as a solo entrant; PayPal Developer account and a Merchant-type
  Sandbox app created; Business and Personal sandbox accounts exist.
- Sandbox tests passed by hand: token, order AUTHORIZE, buyer approval, authorize,
  capture, refund, void before capture. Details in `docs/SANDBOX-NOTES.md`.
- Official rules read (deadline, eligibility, requirements, judging criteria).
- Core domain (merged in PR #1), pure TypeScript, no framework imports:
  - `src/lib/domain/` state machine (`transition(tx, trigger)` returns the next state and
    the PayPal effect the caller must perform before committing).
  - `src/lib/audit/chain.ts` hash-chained audit log (`appendEvent`, `verifyChain`).
  - `src/lib/rules/engine.ts` rules R1-R7 (`decide(input)`), deterministic, with reasons.
  - `src/lib/paypal/client.ts` fetch-based PayPal client with `PayPal-Request-Id`.
    Tested with a fake fetch only; not yet run against the real Sandbox.
- App scaffold (branch `feat/app-scaffold`, Codex): Next.js App Router + TypeScript +
  Tailwind, landing page, SQLite schema in `src/lib/db.ts` using Node's built-in
  `node:sqlite` (Node >= 22.13), append-only triggers on `events`. Payment and dispute
  flows are not implemented yet.

Known mismatch to fix in the orchestrator step: the `events` table (id, ts, prev_hash,
hash) and `src/lib/audit/chain.ts` (which hashes a `seq` number) must agree. Either add a
`seq INTEGER UNIQUE` column or derive seq from insertion order; keep `verifyChain` working
on rows read back from SQLite.

## How to run

```
npm install
npm test          # vitest (domain, rules, audit, PayPal client) + node:test (SQLite)
npm run typecheck
npm run build
npm run dev       # http://localhost:3000
```

## Next steps

1. Orchestrator: `applyTrigger(txId, trigger)` = load tx from SQLite, `transition()`,
   perform the PayPal effect with `requestIdFor()`, then atomically save the new status and
   append an audit event (include PayPal `debug_id` on errors). If the effect fails, do not
   change the status. Resolve the `events`/`seq` mismatch above.
2. A local smoke script that runs the real Sandbox flow (create order, open approval URL,
   authorize, void) using `.env`, so the client is verified end to end (owner runs it).
3. UI design guide `docs/UI.md` (owner is collecting example apps; style goal: clean,
   modern, simple, fast). Do not build screens before it exists.
4. Screens: seller creates terms, buyer pays and confirms or disputes, reviewer decides,
   audit page with chain verification.
5. Webhook endpoint (signature verification, de-duplication, freeze on dispute/reversal).
6. Owner: finish remaining Sandbox tests (webhooks, dispute simulation, Platform app /
   Payouts) and record results in `docs/SANDBOX-NOTES.md`.

## Decisions

Decided on 2026-10-20: stack = Next.js + TypeScript + SQLite (Tailwind for UI), fund
model A (authorize then capture), license MIT, coding tools = Claude Code and Codex
(handoff through this file).

Tentative: AI inside the app = DeepSeek V4.1 Flash through the owner's Hive API key.
Verify the model name, API terms, strict-JSON reliability and image support first.

Still open:
- Who bears the fee on a refund.
- Time parameters (ship-by, inspection window, evidence deadline).
- Final public name (the word "Vault" suggests custody) and hosting.
- Visual style (waiting for the owner's example apps).

## Do not forget

- Deadline: 13 Nov 2026, 03:00 WIB (12 Nov, 12:00 PM PT). Internal target: 11 Nov night.
- Everything for judges must be in English. Demo video under 3 minutes on YouTube.
- Never commit secrets. Sandbox only.
- Avoid forbidden claims listed in `AGENTS.md`.
- Make the repo public before submitting.

## Log

- 2026-10-20 23:00 WIB (Claude): merged `main` (core domain) into `feat/app-scaffold`,
  which had been branched before PR #1 was merged. Kept Codex's Next.js config, added
  vitest back for the domain tests, combined both test runners in `npm test`.
- 2026-10-20 (Codex): scaffolded Next.js + Tailwind and the SQLite schema on
  `feat/app-scaffold` (commit 187e13b). Could not open the PR (GitHub API forbidden).
- 2026-10-20 22:30 WIB (Claude): built the core domain (state machine, audit chain, rules,
  PayPal client, 55 tests); pushed and merged as PR #1.
- 2026-10-20 (Claude): drafted docs, agent instructions, `.env.example`, `.gitignore`,
  README stub, MIT `LICENSE`; recorded owner decisions.

---

Ringkasan singkat (Bahasa Indonesia, untuk Ilham): inti logika (PR #1) dan kerangka
aplikasi Next.js + SQLite (dari Codex) sudah digabung di cabang `feat/app-scaffold`.
Berikutnya: penghubung logika, database, dan PayPal; panduan tampilan `docs/UI.md`
setelah kamu mengirim contoh aplikasi; lalu layar-layar utama.
