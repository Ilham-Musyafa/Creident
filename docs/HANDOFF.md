# HANDOFF.md

Shared notes so any agent (Claude, Codex, others) can continue the work.
Update this file at the end of every session and before usage limits run out.
Keep it short and current. Newest entry first in the log.

## How to resume

1. Read `AGENTS.md`, `docs/DESIGN.md`, `docs/UI.md`, `docs/SANDBOX-NOTES.md`, then this file.
2. `git fetch origin`, check `git status` and the open pull requests.
3. Pick the first item under "Next steps" unless the owner says otherwise.
4. Create a new branch **from the latest `origin/main`**, and only after the previous PR is
   merged. Do not stack a new task on an unmerged branch. Do not push to `main`.

## Current status (2026-10-21)

Project locked on 2026-10-20: dispute-mediation prototype for the PayPal AI Hackathon,
working name HalcyVault, narrow scope (`docs/DESIGN.md`). Repo `Ilham-Musyafa/HalcyVault`
is private during development; it must be made public before submission and stay public
until 15 Dec 2026.

Built (all on `integrate/codex-batch` until merged):
- Core domain (`src/lib/domain`, `audit`, `rules`, `paypal`): state machine, hash-chained
  audit log, rules R1-R7, fetch-based PayPal client incl. webhook signature verification.
- Persistence and orchestrator (`src/lib/db.ts`, `repository.ts`, `orchestrator.ts`):
  SQLite via `node:sqlite`, per-transaction audit `seq`, append-only events, request ids
  claimed before PayPal calls; interrupted calls stay pending for reconciliation instead
  of being sent twice.
- JSON API (`src/app/api/**`): create, accept terms, pay, PayPal return, ship (mock
  courier), confirm, dispute, evidence, review (reason required), audit and verify,
  deadline tick, PayPal webhook. Demo roles via `x-demo-role`; no real authentication.
- AI evidence summary (`src/lib/ai/evidence.ts`): OpenAI-compatible adapter (env
  `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`), strict schema, one retry, name masking,
  seeded order, injection flag, replay mode by default without a key. On
  `feat/review-pipeline`, it is wired into review preparation at all three paths to
  `UNDER_REVIEW`: evidence complete, evidence deadline, and tracking mismatch. The
  stored recommendation includes the AI summary or null, rule, action, reasons, and
  human-review requirement, plus an audit event. GET `/api/transactions/:id/review`
  reads it. AI failure becomes an R5 human escalation. `SPLIT` with a human reason is
  recorded as pending without moving funds.
- Evaluation (`eval/`, `npm run eval`): 40 synthetic dispute cases + 10 injection cases,
  six counterfactual variants each, report in `eval/report.md`. Labels are drafts that
  need owner review; replay results check the harness and rules, not a live model.
- Sandbox smoke script (`npm run smoke`) for the owner's PC.
- App shell (`src/app/layout.tsx`, `page.tsx`, Tailwind 4). **No UI screens yet.**

Checks on 2026-10-21: `npm test` 89 passed (10 files), `npm run typecheck` passed,
`npm run build` passed, `npm run eval` ran in replay mode.

Not verified yet (needs the owner or a public URL): real Sandbox run of the smoke script
and the JSON routes, real webhook delivery, any live AI provider call.

## How to run

```
npm ci
npm test
npm run typecheck
npm run build
npm run dev        # http://localhost:3000 (API only for now)
npm run eval       # writes eval/report.md (replay mode without an AI key)
npm run smoke      # owner's PC only: real PayPal Sandbox, reads .env
```

## Next steps

1. Owner: run `npm run smoke` on Windows for both paths (void; capture + refund) and record
   the results in `docs/SANDBOX-NOTES.md`.
2. Review `feat/review-pipeline`, then merge it after checks. Only the human review
   POST executes RELEASE or REFUND for disputed transactions. The owner still needs
   to define the amount and payment treatment of a pending SPLIT decision.
3. UI screens following `docs/UI.md` (tokens, light/dark/system, 8 screens), calling the
   existing JSON API. Keep `src/lib/` free of UI imports.
4. Owner: review every evaluation label and rationale; then expand the set toward the
   size proposed in DESIGN section 10 and run once with the chosen live provider.
5. Owner: public HTTPS URL + `PP_WEBHOOK_ID`, then test real webhook delivery.
6. README for judges (English): problem, how it works, what is simulated, run steps,
   eval results with limits, production path.

## Decisions

Decided: stack Next.js + TypeScript + SQLite + Tailwind; fund model A (authorize then
capture); license MIT; visual direction Midnight Ink + Mint with light/dark/system
(`docs/UI.md`); coding tools Claude Code and Codex (handoff through this file).

Tentative: AI provider DeepSeek V4.1 Flash via the owner's Hive API key (verify model name,
API terms, strict-JSON reliability, image support).

Still open:
- Who bears the fee on a refund.
- Final time parameters (temporary: ship-by 3 days, inspection 2 days, evidence 2 days;
  configurable via environment variables).
- Final public name (the word "Vault" suggests custody) and hosting.

## Do not forget

- Deadline: 13 Nov 2026, 03:00 WIB (12 Nov, 12:00 PM PT). Internal target: 11 Nov night.
- Everything for judges must be in English. Demo video under 3 minutes on YouTube.
- Never commit secrets. Sandbox only.
- Avoid forbidden claims listed in `AGENTS.md`.
- Make the repo public before submitting.

## Log

- 2026-10-21 (Codex): wired the AI evidence summary and deterministic rules into
  review preparation on `feat/review-pipeline`. Recommendations are stored once with
  audit events; GET exposes them, and reviewer POST keeps the money-moving gate.
  Provider failure and injection escalate; SPLIT is a reasoned pending decision with
  no payment call. No new dependencies or live provider calls. Verification:
  `npm test` (94/94), `npm run typecheck`, and `npm run build` all passed.
- 2026-10-21 01:20 WIB (Claude): integrated the Codex branches. They had been created from
  `main` before the app scaffold was merged and were stacked on each other, so they were
  merged into `integrate/codex-batch` (eval + webhook + sandbox-smoke + app-scaffold).
  Conflicts were additive and resolved by keeping both sides; kept the integrated
  `db.ts`/`tsconfig.json`/`next.config.ts`, added Tailwind and the app shell from the
  scaffold, dropped the scaffold's old `db.test.ts` (it targeted the earlier schema without
  `seq`), fixed one test type error that broke `next build`, rewrote this file.
- 2026-10-20 (Codex): six tasks on separate branches: orchestrator, sandbox smoke, API
  routes, PayPal webhook, AI evidence summary, evaluation harness. No live PayPal or AI
  calls; no new runtime dependencies (vitest 5 / vite 8 as dev tools).
- 2026-10-21 00:50 WIB (Claude): UI guide and mockups (PR #3).
- 2026-10-20 (Codex): Next.js + Tailwind scaffold and SQLite schema (PR #2).
- 2026-10-20 (Claude): core domain (PR #1); project docs, agent instructions, license.

---

Ringkasan singkat (Bahasa Indonesia, untuk Ilham): semua pekerjaan Codex sudah disatukan
dan diuji (89 uji lolos, build lolos). Yang belum: menjalankan skrip uji Sandbox di
komputermu, menghubungkan ringkasan AI ke alur tinjauan, membuat layar sesuai
`docs/UI.md`, dan memeriksa label uji bias.
