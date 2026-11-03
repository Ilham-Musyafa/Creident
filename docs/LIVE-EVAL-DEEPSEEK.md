# Live-model evaluation: one run with DeepSeek

Date: 2026-11-03/04. This is a **single run** of `npm run eval` in live mode. It does not
replace the recorded-replay report in `eval/report.md`, and `eval/results.json` (the
source of the in-app Fairness page) was **not** overwritten.

## Setup

| Item | Value |
| --- | --- |
| Model | `deepseek-ai/deepseek-v4.1-flash-1017`, through an OpenAI-compatible endpoint |
| Mode | `AI_MODE=live`, `temperature: 0`, PayPal simulated |
| Cases | the same 62 synthetic cases plus six counterfactual variants each (372 variants) |
| Repeats | `EVAL_K=1`, so repeat consistency was **not measured** |
| Labels | 10 reviewed individually, 40 drafts accepted without individual review, 12 still drafts |
| Local change | The run used a throwaway copy of the repo with a 60 s request timeout and a retry loop, because the committed 10 s timeout failed on a slow network. The committed code is unchanged. |

## Results (live vs recorded replay)

| Metric | Live (DeepSeek, k=1) | Replay (k=3) |
| --- | --- | --- |
| False release / false refund | 0/28 / 0/28 | 0/28 / 0/28 |
| Injection attacks that succeeded | 0/10 | 0/10 |
| Counterfactual flips | 35/372 (9.4%) | 0/372 |
| Human escalation | 49/62 (79.0%) | 25/62 (40.3%) |
| Matches labels on non-escalated cases | 11/13 (84.6%) | 35/37 (94.6%) |
| Repeat consistency | not measured | 124/124 |

26 of 62 base cases differ from their expected label. 24 are "expected REFUND or RELEASE,
got ESCALATE_HUMAN" (the cautious direction). 2 are shipping/return cases that do not use
the AI summary and also differ in the replay run (expected ESCALATE_HUMAN, got WAIT).

## What this does and does not show

- In this run no case was decided for the wrong side and no injection attack succeeded.
- That result is partly because the system sent 79% of cases to a person. Only 13 of 62
  cases were decided by the rules, so the zero counts rest on a small number of automatic
  decisions and should not be read as a measure of model quality.
- A diagnostic on three raw model replies showed valid JSON that passed the strict
  validation, with `missingEvidence: true`. Rule R5 then escalates by design. So, in the
  cases we looked at, the escalation came from the model flagging missing evidence, not from
  a formatting failure. Three replies from one case are not a full breakdown; the share of
  escalations by reason was **not** measured.
- Variant outcomes changed in 9.4% of runs with this model, so its summaries are less
  stable than the recorded replay.
- One model, one run, k=1, a small synthetic set, partly unreviewed labels. These are
  indicative results, not proof of model fairness or accuracy.

## Still open

- Repeat the run with `EVAL_K=3` to measure consistency.
- Count escalations by reason.
- Review more labels individually.
