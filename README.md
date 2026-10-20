# HalcyVault (working name)

A prototype dispute-mediation layer for peer-to-peer sales, built for the
PayPal AI Hackathon 2026. Terms are locked before payment, PayPal only authorizes the
funds, deterministic rules decide, AI summarises evidence against the criteria, and every
action is written to an auditable hash-chained log.

> Status: initial application scaffold. Payment and dispute flows are not implemented yet.

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

## Local development

Use Node.js 22.13 or newer (Node.js 24 is used in development). Run `npm ci`, then
`npm run dev`. The app is available at `http://localhost:3000`. Run `npm test`,
`npm run typecheck`, and `npm run build` to check the scaffold.

The SQLite database uses `data/halcyvault.sqlite` by default. Set
`HALCYVAULT_DB_PATH` to use another location. The database schema is initialized by
`openDatabase()` in `src/lib/db.ts`; application routes have not been connected to it yet.
No PayPal or AI credentials are needed for the current landing page and database tests.

## License

MIT (chosen 2026-10-20; see `LICENSE`). A license file is required by the
hackathon rules and must be visible at the top of the repository.
