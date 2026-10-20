# HalcyVault (working name)

A prototype dispute-mediation layer for peer-to-peer sales, built for the
PayPal AI Hackathon 2026. Terms are locked before payment, PayPal only authorizes the
funds, deterministic rules decide, AI summarises evidence against the criteria, and every
action is written to an auditable hash-chained log.

> Status: work in progress. This README is a stub and will be completed before submission.

**This is a hackathon demo on the PayPal Sandbox. It is not a licensed escrow service and
does not handle real money.**

## Planned sections

1. The problem and who it is for
2. How it works (state machine, rules, role of the AI)
3. What is real and what is simulated (seller payout, courier tracking)
4. Run it yourself (prerequisites, `.env` setup, install, run, test accounts)
5. Test results (fairness and robustness report)
6. Limitations and the production path
7. Tech stack and AI tools used
8. License

## Docs

- `docs/DESIGN.md` — design
- `docs/SANDBOX-NOTES.md` — what was tested against the PayPal Sandbox
- `docs/HANDOFF.md` — working notes for contributors and AI agents

## License

MIT (chosen 2026-10-20; see `LICENSE`). A license file is required by the
hackathon rules and must be visible at the top of the repository.
