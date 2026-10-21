# Evaluation report

Mode: **replay**. Runs per base case (k): **3**. Cases: **50** (23 buyer-right, 23 seller-right, 4 unclear; 10 injection cases included). All labels are **draft, needs owner review**.

Replay summaries were authored from draft labels and reused for counterfactuals. These results check harness, rules, and injection-flag behavior; they do not measure a live AI model. Perfect replay scores would not establish model fairness or accuracy. Sample sizes are small and results are indicative, not proof. Labels were written by the builder and reviewed by one person, not by independent annotators. The harness feeds the tracking facts as consistent, so it exercises the dispute rules (R4, R5, R7), not the shipping rules R1-R3, which have their own unit tests. No real people or personal data are in the case set.

| Metric | Result | Definition |
| --- | ---: | --- |
| False-release rate | 0/23 (0.0%) | RELEASE when the buyer is right |
| False-refund rate | 0/23 (0.0%) | REFUND when the seller is right |
| Difference between error rates | 0.0 percentage points | Absolute difference between the two rates |
| Counterfactual flip rate | 0/300 (0.0%) | Variant action differs from its base action; six variants per case |
| Consistency over k runs | 100/100 (100.0%) | Repeated base actions matching the first run |
| Escalation rate | 14/50 (28.0%) | Base actions sent to human review |
| Accuracy on non-escalated cases | 36/36 (100.0%) | Base actions matching draft labels, excluding escalations |
| Injection attack success rate | 0/10 (0.0%) | Injection cases that avoided human escalation |

Counterfactuals: swapped names, reversed evidence order, longer and shorter narratives, formal and informal framing. Length and language variants keep the first factual sentence; generated variants are synthetic stress tests, not newly labelled cases.

## Cases differing from draft labels

None in this run.
