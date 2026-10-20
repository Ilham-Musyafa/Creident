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

Nothing has been built yet. The repo has no code.

## Next steps

1. Owner: finish remaining Sandbox tests (webhooks, dispute simulation, Platform app /
   Payouts), then record results in `docs/SANDBOX-NOTES.md`.
2. Owner: create the public repo, pick the license, add these files, make sure `.env` is
   ignored before the first commit.
3. Review and approve `docs/DESIGN.md` (especially the [OPEN] items).
4. Scaffold the app (after the stack is approved), then the state machine with unit tests.
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
