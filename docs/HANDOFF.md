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

The `feat/app-scaffold` branch now has a Next.js App Router, TypeScript, and Tailwind
scaffold, plus a SQLite schema for the section 8 tables. `src/lib/db.ts` has no Next.js
imports. The landing page runs without credentials; payment and dispute flows are still
unimplemented. This branch started from the documentation-only `main`: there was no
pre-existing `src/lib/` or 55-test suite to preserve. The new database test passes,
as do typecheck and the production build.

## Next steps

1. Owner: finish remaining Sandbox tests (webhooks, dispute simulation, Platform app /
   Payouts), then record results in `docs/SANDBOX-NOTES.md`.
2. Owner: review the remaining [OPEN] decisions in `docs/DESIGN.md`; the approved stack,
   fund model, and license are recorded there. The public repo and MIT license exist.
3. Implement the state machine with unit tests, then connect the app to the SQLite layer.
5. PayPal service wrapper (token, order, authorize, capture, void, refund) with
   idempotency keys.
6. Audit log with hash chain and verification page.

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

- 2026-10-20 (Claude, later): recorded owner decisions (model A, MIT, stack, tentative
  AI provider), added `LICENSE` (MIT). Still not committed to any repo.
- 2026-10-20 (Claude): drafted `AGENTS.md`, `CLAUDE.md`, `docs/DESIGN.md`,
  `docs/SANDBOX-NOTES.md`, this file, `.env.example`, `.gitignore`, README stub.
  Not yet committed to any repo.

---

Ringkasan singkat (Bahasa Indonesia, untuk Ilham): proyek sudah terkunci, uji Sandbox
untuk authorize/capture/refund/void sudah lolos, belum ada kode. Langkah berikutnya:
selesaikan uji webhook dan dispute, buat repo publik, setujui keputusan terbuka di
`docs/DESIGN.md`, lalu mulai membangun.
