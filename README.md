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

## License

MIT (chosen 2026-10-20; see `LICENSE`). A license file is required by the
hackathon rules and must be visible at the top of the repository.
