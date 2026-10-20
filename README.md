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

## JSON API demo

Use Node.js 22.13 or newer. Copy `.env.example` to `.env`, fill in the Sandbox
PayPal credentials, then run `npm install` and `npm run dev`. The API stores data
in `data/halcyvault.sqlite` by default; `HALCYVAULT_DB_PATH` can change that path.
There are no UI pages or real authentication yet. Each request must declare its
demo role with `x-demo-role: buyer`, `seller`, or `reviewer`; the PayPal return URL
uses `role=buyer` instead. The server checks which demo role may perform each action.
Use synthetic item descriptions and evidence only.

Create a transaction with `POST /api/transactions` as seller, using JSON fields
`item`, `amount` (for example `"10.00"`), and `terms` (an object). Both seller and
buyer call `POST /api/transactions/{id}/accept`; the second acceptance locks the
terms. The buyer then calls `POST /api/transactions/{id}/pay` and opens the returned
`approvalUrl` in a Sandbox Personal account. The PayPal return endpoint checks the
order status and authorizes it. The seller calls `POST /api/transactions/{id}/ship`
with `{"tracking":"DEMO-DELIVERED"}`. Other simulated samples are
`DEMO-IN-TRANSIT` and `DEMO-WRONG-DESTINATION` (also available at
`GET /api/mock-courier/{tracking}`). The buyer can call `POST .../confirm` or
`POST .../dispute`; buyer and seller submit `POST .../evidence` with `kind` and
`content`. A reviewer can call `POST .../review` with `outcome` (`RELEASE` or
`REFUND`) and a required `reason`. See `docs/DESIGN.md` for the state machine.

Call `POST /api/jobs/tick` as reviewer to process due shipping, inspection, and
evidence deadlines. The placeholder defaults are 3, 2, and 2 days, respectively;
set `SHIP_BY_DAYS`, `INSPECTION_DAYS`, and `EVIDENCE_DAYS` to change them. Audit
events are available at `GET /api/audit/{id}`, and `GET /api/audit/verify` checks
all transaction chains. The courier responses are fixed, simulated data.

## License

MIT (chosen 2026-10-20; see `LICENSE`). A license file is required by the
hackathon rules and must be visible at the top of the repository.
