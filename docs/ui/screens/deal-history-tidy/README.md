# Per-deal history timeline QA

Production Playwright captures: 390, 1280 and 2560px; Seller, Buyer and Reviewer; light and dark. Each view opens the newest step with the keyboard, retaining its focus ring.

- `completed-*`: built-in Board game set, 10 verified steps.
- `disputed-*`: built-in Road bike helmet, 9 verified steps.

All 36 views passed checks for event count/order, stored acceptance actors, one demo note, direct expanded check values, no nested disclosure, 44px targets, 900px desktop timeline maximum and 16px mobile gutters. No horizontal overflow or browser console warnings/errors occurred. All steps were also expanded to check nonempty values and overflow.

The summary counts distinct stored human roles rather than claiming a number of people. QA used a separate temporary SQLite database in simulated payment / replay AI mode. Production data and seeds were not changed.
