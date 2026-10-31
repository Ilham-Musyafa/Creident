# Fairness results consistency QA

18 production Playwright captures: 390, 1280 and 2560px × Seller, Buyer and Reviewer × light and dark.

Both differing cases are opened with the keyboard in every capture. The final focus ring stays visible. The page scrolls back to the top before capture so the fixed navigation is shown at its normal position.

Verified:
- Counts first, percentages second, measured-value bar fills and the same neutral direction cue style.
- Three desktop cards and their first metric rows align; answer-key agreement belongs to Steady answers, Safety has one metric.
- Human-readable case titles, expected/recorded outcome lines, raw IDs inside expanded Technical details sections, no nested disclosure or empty gap, case tap targets at least 44px.
- Label-review counts and all scope/caveat facts retained; bottom Technical details opens with the keyboard.
- No horizontal overflow or browser console errors/warnings in any view.

The page reads the unchanged committed evaluation results (62 made-up cases, recorded AI answers). No evaluation or production data/configuration changes were made.
