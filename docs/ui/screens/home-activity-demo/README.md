# Desktop Home activity and demo guide QA

Before/after production captures: 390/1280/1920/2560px × Seller/Buyer/Reviewer × light/dark (24 views per stage), with built-in demo deals in an isolated temporary database.

- Existing Overview, Your next step and Your deals text/geometry match baseline exactly.
- All six mobile before/after image pairs match byte-for-byte; new cards stay hidden below 1024px.
- Extras stack at 1280px and use two equal columns at 1920/2560px, with 32px separation from Your deals and 28px padding.
- Recent activity shows five timestamp-sorted events, existing Activity labels and relative times. Rows link to their deals, have at least 44px targets and visible keyboard focus.
- Guide links resolve to existing Settings role anchors and Transactions. Actual clicks were checked for all three roles; every new link returned HTTP 200.
- `empty-non-demo-1920.png`: empty activity and hidden guide outside simulated/public demo mode.
- No horizontal overflow or console errors/warnings.

Typecheck, 632 tests / 59 files and production build passed. Seven new tests cover cross-deal ordering, ordering before limiting, party visibility, Activity label/omission reuse, empty results and truthful conditional guide wording. Buyer/Seller activity uses their existing party IDs; Reviewer retains existing deal-page read visibility. A simulated/live-AI configuration says live AI answers rather than incorrectly claiming recorded answers. No production data/configuration changes were made.
