# TASK-<number>: <short title>

<!-- Purpose of each part is in the comment under its heading. Delete the comments when filling. -->

## Goal
<!-- Why the task exists, so the worker makes small decisions correctly. 1-2 sentences. -->

## Files you may touch
<!-- Limits scope and avoids conflicts with other agents. Ask before touching anything else. -->
-

## What to do
<!-- Concrete steps, not general intentions. -->
1.

## Constraints
<!-- Things that must not happen. -->
- No new dependency. No change to data shape, API or payment/dispute logic.
- Follow AGENTS.md. One branch, open a pull request, never push to main.

## How to test
<!-- Machine-checkable proof of "done". -->
- `npm run typecheck && npm test && npm run build`
- Manual check: <page, widths, expected behaviour>

## Done when
<!-- The checklist the reviewer will use. -->
- [ ] All test commands pass
- [ ] <expected result 1>
- [ ] No console errors or warnings

## Final report (max 10 lines)
<!-- Keeps the review cheap: summary, files changed, test results, unfinished items, decisions needed. -->
