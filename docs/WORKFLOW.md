# WORKFLOW.md — how to use the AI tools economically

Short rules so Claude (orchestrator) and Codex (worker) stay cheap and consistent.
Shared project rules live in `AGENTS.md`; current status in `docs/HANDOFF.md`.

## Roles
- **Claude (Lead):** decides, writes the backlog, reviews risky diffs. Does not write long code.
- **Codex / other workers:** implement one task each from `docs/templates/TASK.md`.
- **Machines first:** `npm run typecheck`, `npm test`, `npm run build` are the first reviewer.

## Sessions
- One big task = one new conversation. Small follow-ups stay in the same one.
- Start a new conversation with: "Read AGENTS.md and docs/HANDOFF.md", plus a 5-line summary
  (decisions made, what is done, what is next).
- End every session by updating `docs/HANDOFF.md` (keep it short; move old log entries to
  `docs/archive/`).

## What to send Claude for review
1. `git diff --stat`
2. The diff of risky files only (money, rules, security, data shape)
3. Failing test output only
4. The worker's final report (max 10 lines)
UI-only and copy changes: typecheck, tests and screenshots are enough.

## Model choice
- Default: Sonnet (small diffs, summaries, copy, quick questions).
- Opus: 1-2 times a week for expensive decisions (architecture, data schema, business rules,
  final review of risky changes).
- Stop-loss: when about 25% of the weekly quota is left, stop using Opus; park decisions in
  HANDOFF for next week.

## Habits that save quota
- One question per message; ask for short answers.
- Paste the relevant 30 lines, not the whole file.
- Do not ask Claude to write long code; give it to the worker.
- Write the backlog once a week (8-10 tasks with goal and done-criteria), then fill
  `docs/templates/TASK.md` per task.
