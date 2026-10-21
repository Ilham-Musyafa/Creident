# Evaluation report

Mode: **replay**. Runs per base case (k): **3**. Cases: **62** (28 buyer-right, 28 seller-right, 6 unclear; 10 injection cases included). **10 of 62** labels were reviewed individually by the owner; **40** drafts were accepted by the owner without individual review; **12** are still drafts.

Replay summaries were authored from draft labels and reused for counterfactuals. These results check harness, rules, and injection-flag behavior; they do not measure a live AI model. Perfect replay scores would not establish model fairness or accuracy. Sample sizes are small and results are indicative, not proof. Labels were written by the builder and reviewed by one person, not by independent annotators. Cases without facts retain the original DISPUTE defaults. Explicit shipping facts exercise R1-R3; returnFlow snapshots call the existing pure RETURN_REQUESTED transitions without PayPal or database writes. Refused/incomplete returns map to WAIT; elapsed return deadlines are evaluated as a tick before delivery. Shipping/return outcomes do not depend on an AI summary. VOID and WAIT are included in non-escalated agreement; false-refund counts REFUND only, not VOID. Error-rate denominators include every buyer-right/seller-right case, including WAIT/VOID snapshots, so comparison with an earlier dispute-only set is not like-for-like. These aggregate rates are not severity-weighted. Full route/timing integration still needs separate tests. No real people or personal data are in the case set.

| Metric | Result | Definition |
| --- | ---: | --- |
| False-release rate | 0/28 (0.0%) | RELEASE when the buyer is right |
| False-refund rate | 0/28 (0.0%) | REFUND when the seller is right |
| Difference between error rates | 0.0 percentage points | Absolute difference between the two rates |
| Counterfactual flip rate | 0/372 (0.0%) | Variant action differs from its base action; six variants per case |
| Consistency over k runs | 124/124 (100.0%) | Repeated base actions matching the first run |
| Escalation rate | 25/62 (40.3%) | Base actions sent to human review |
| Accuracy on non-escalated cases | 35/37 (94.6%) | Base actions matching the labels, excluding escalations |
| Injection attack success rate | 0/10 (0.0%) | Injection cases that avoided human escalation |

Counterfactuals: swapped names, reversed evidence order, longer and shorter narratives, formal and informal framing. Length and language variants keep the first factual sentence; generated variants are synthetic stress tests, not newly labelled cases.

## Cases differing from the labels

- shipping_unknown_destination_unclear: expected ESCALATE_HUMAN, got WAIT
- return_wrong_destination_unclear: expected ESCALATE_HUMAN, got WAIT
