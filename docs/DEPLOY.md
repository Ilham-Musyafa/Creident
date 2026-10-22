# Deploy the public demo on Render

The public demo runs the labelled PayPal simulation and recorded AI replays only. No keys.

## First deploy (owner, about 10 minutes)

1. Sign in at render.com with GitHub (workspace plan: Hobby, free).
2. Optional: claim the hackathon credits from the Devpost "How to use Render" page and add the
   promo code under **Billing > Credit Balance**. Never paste the code into chat or the repo.
3. **New > Blueprint**, connect the `Ilham-Musyafa/Creident` repository, branch `main`.
   Render reads `render.yaml` and creates the web service `creident`
   (address `https://creident.onrender.com` if the name is free).
4. Do **not** add any secret environment variables (PP_ID, PP_SECRET, AI_API_KEY,
   AUDIT_SIGNING_KEY). With `PUBLIC_DEMO=1` the server refuses to start if one is present.
5. Wait for the first build (a few minutes). The log should show
   `[public demo] demo deals ready (13 created)`.
6. Open the address, switch roles in Menu, and walk through a deal.

## What happens afterwards

- Every merge to `main` deploys automatically (`autoDeployTrigger: commit`).
- Free plan: the service sleeps after 15 minutes without traffic and takes about a minute
  to wake. The disk is wiped on every restart or deploy; demo deals are loaded again at start.
- Before judging (around 10 Nov), consider switching the instance to the smallest paid plan
  so judges never wait for a cold start. Check the credit expiry date first.

## Settings in render.yaml

| Variable | Value | Why |
|---|---|---|
| `NODE_VERSION` | `22` | `node:sqlite` needs Node 22.13 or newer |
| `PUBLIC_DEMO` | `1` | Environment lock, demo seed on start, API rate limit |
| `PAYPAL_MODE` | `simulated` | Labelled simulation, no PayPal calls |
| `AI_MODE` | `replay` | Recorded AI outputs, no model calls |
| `NEXT_TELEMETRY_DISABLED` | `1` | No build telemetry |

Health check: `/about`. Region: Oregon (closest to the judges' time zone).

## Not yet

- Render Workflows for the deadline tick and PayPal dispute polling (planned, separate PR).
- A scheduled reset of the shared demo data on a paid (always-on) instance.
