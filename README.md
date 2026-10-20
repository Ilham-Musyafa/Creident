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
`REFUND`) and a required `reason`. `GET .../review` returns the stored AI summary
and rule recommendation after review preparation. A reviewer may also POST `SPLIT`
with a reason; this records a pending decision and moves no funds while split payment
rules remain undecided. See `docs/DESIGN.md` for the state machine.

Call `POST /api/jobs/tick` as reviewer to process due shipping, inspection, and
evidence deadlines. The placeholder defaults are 3, 2, and 2 days, respectively;
set `SHIP_BY_DAYS`, `INSPECTION_DAYS`, and `EVIDENCE_DAYS` to change them. Audit
events are available at `GET /api/audit/{id}`, and `GET /api/audit/verify` checks
all transaction chains. The courier responses are fixed, simulated data.

## AI evidence summary

`src/lib/ai/evidence.ts` produces a validated `AiSummary` for the deterministic
rules engine. It does not call PayPal or change transaction status. Evidence is
treated as quoted data, party names are replaced with Buyer and Seller, and a seed
sets the presentation order. Suspected prompt injection is flagged for human review.
Invalid model output is retried once; a second invalid result yields `null`, so the
rules escalate.

With no `AI_API_KEY`, the module defaults to replay mode and reads synthetic cases
from `src/lib/ai/replay-cases.json`. Only an exact recorded case gets a replayed
summary. For a compatible live chat-completions service, set `AI_MODE=live`,
`AI_BASE_URL` (API base, such as a URL ending in `/v1`), `AI_API_KEY`, and `AI_MODEL`
in `.env`. The provider and model are not fixed by this project. Use synthetic
evidence only. Review preparation calls this module when a transaction enters
`UNDER_REVIEW`. If no recorded replay case matches the stored evidence, or if a
live provider fails, the rules store an R5 recommendation for human review. Run
`npm test` to exercise the replay and fake-provider paths.

## Synthetic evaluation

Run `npm run eval` to evaluate 40 draft dispute cases and 10 draft prompt-injection
cases from `eval/cases/*.json`. The command writes `eval/report.md`. It runs in replay
mode when `AI_API_KEY` is empty; set `AI_MODE=replay` to force replay even when a key
is configured. Set `AI_MODE=live` with the AI variables above to test a compatible
provider. `EVAL_K` controls repeated runs per base case (default 3, range 1-20).
The harness also generates name, evidence-order, narrative-length, and language-style
variants automatically. Labels and rationales are draft and need owner review.
Replay summaries were authored from those draft labels, so replay metrics describe
the harness and rules, not live model performance. All cases are synthetic.
## How to run the Sandbox smoke test

On a Windows PC with Node.js 22.13 or newer, open PowerShell in this repository:

```powershell
npm ci
Copy-Item .env.example .env
```

Edit `.env` with the **Sandbox** app's `PP_ID` and `PP_SECRET`. Keep
`PP_URL=https://api-m.sandbox.paypal.com`. The script rejects the Live API URL.
Do not commit `.env` or share its contents. Then run:

```powershell
npm run smoke
```

The script creates a 10.00 USD AUTHORIZE order and prints the buyer approval URL.
Open that URL, sign in with the Sandbox Personal account, and confirm the purchase.
Return to PowerShell and press Enter. Choose **a** to void the authorization and
verify `VOIDED`, or **b** to capture, view the fee breakdown, then issue a full refund
and verify `COMPLETED`. Run the script again for the other path; each run creates a
new Sandbox order. No global TypeScript runner is needed.

## Screens

Mobile-first web app with light, dark and system themes (`docs/UI.md`).
Screenshots from the running app: `docs/ui/app-screens-light.png`, `docs/ui/app-screens-dark.png`.

- `/` home (role-aware), `/deals`, `/deals/new` (seller), `/deals/[id]` (timeline and next step),
  `/deals/[id]/checkout` (buyer), `/deals/[id]/evidence`, `/deals/[id]/review` (reviewer),
  `/audit` and `/audit/[id]` (hash-chain verification), `/menu`, `/about`.
- Choose the demo role (buyer, seller, reviewer) in Menu. Roles replace sign-in in this demo.
- Menu > "Load demo deals" creates ten labelled `[Demo]` deals across the statuses. They use a
  simulated PayPal stub (ids start with `DEMO-`); their audit chains are real.
- Payment, confirm and dispute decisions call the PayPal Sandbox and need `PP_ID`/`PP_SECRET`
  in `.env`. Without them the screens show a clear message.

## Local development

Use Node.js 22.13 or newer (Node.js 24 is used in development). Run `npm ci`, then
`npm run dev`. The app is available at `http://localhost:3000`. Run `npm test`,
`npm run typecheck`, and `npm run build` to check the project.

The SQLite database uses `data/halcyvault.sqlite` by default. Set
`HALCYVAULT_DB_PATH` to use another location. The database schema is initialized by
`openDatabase()` in `src/lib/db.ts` and used by the JSON API routes.
No PayPal or AI credentials are needed to run the tests or the evaluation in replay mode.

## License

MIT (chosen 2026-10-20; see `LICENSE`). A license file is required by the
hackathon rules and must be visible at the top of the repository.
