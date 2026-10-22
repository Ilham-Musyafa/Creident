# Sponsor tools: what each one asks for, and our plan

Checked on 2026-10-22 from each sponsor's details page on Devpost
(`paypalaihackathon.devpost.com/details/<name>`). Re-check before submitting; pages change.

Stacking rule (official rules): a project can win at most **one Grand Prize or Honorable
Mention plus one Sponsor Prize**. Using more sponsor tools adds chances, not prizes, so each
tool must earn its place in the product.

Owner decision (2026-10-22): approved AG Studio (main), Render (deploy + Workflows),
APIMatic Context Plugin (optional), Bryntum (backup only) and a Postman collection of the
HalcyVault API (no prize; shows the API as an integration layer). Skip Channel3, Elastic,
KERNEL, Astropods and Zapier. Notifications stay in-app; an outgoing webhook that a
marketplace could connect to Zapier is a roadmap item only.

## Tools with a prize

| Tool | Prize | What the page asks for | Access | Fit for us | Plan |
|---|---|---|---|---|---|
| AG Grid | $5,000 / $2,000 / 3 x $1,000 | **AG Studio** dashboards ("embedded analytics"): visual polish *and* how it is built; custom widgets, theming, layout tools, "not just AG Grid or AG Charts on their own"; Studio Agent Framework encouraged | 45-day trial (name + email); local evaluation works without a key (watermark, console warnings) | High: reviewer oversight dashboard (disputes, escalations, AI draft unchanged/edited/ignored, audit-chain widget, deadline queue) | **Main target.** Build without a key ~26-27 Oct; owner registers the trial 7-8 Nov (results 21 Dec); ask AG Grid on Discord about public-demo use and an extension. Boilerplate: github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate |
| Render | $1,000 / $750 / $500 in credits | Deploy on Render **and use Render Workflows** (background jobs, agents, pipelines as SDK tasks) | $50 credits via the portal on the page | High: we deploy there anyway; the deadline tick and PayPal dispute polling are natural Workflow tasks | **Do.** Deploy the public demo on Render; move tick + dispute polling into a Render Workflow if the SDK supports our Node runtime; claim the $50 credits (they can cover the paid instance during judging) |
| APIMatic | 3 x $1,000 (+ 6 months Business for winners) | Use the **APIMatic Context Plugin for PayPal** in an AI coding tool (e.g. Claude Code) to build the PayPal integration; free subscriptions claimed via a form | No extra credentials ("PayPal is already enabled"); setup on a resource page linked from the details page | Medium: we build with Claude Code and Codex; the partial-refund work calls the PayPal refund API | **Optional, cheap.** Use the plugin while building partial refunds, note it in README section 8, and claim the free month. Do not let it delay features |
| Bryntum | 3 x $1,000 | Best use of **Gantt, Scheduler and/or Calendar**; their idea list includes a "dispute triage board" | 45-day trial package via npm | Medium-high: a deadline timeline (ship-by, inspection, evidence, return) per deal | **Backup** if AG Studio is blocked (licence or public-demo use). Not both: same reviewer screen, one prize only |
| Channel3 | $1,500 | Call the Channel3 product API or MCP server as a meaningful part of the product; references alone do not count | Free key, 20,000 credits with promo code, no card | Low: product catalog search for merchants, not one-off second-hand items | **Skip** |

## Partner tools without a prize

| Tool | What it is / offers | Fit | Plan |
|---|---|---|---|
| Postman | PayPal API collection, free plan, learning path | Medium: a collection of the HalcyVault API (simulated-mode flow) shows the integration-layer story | **Do** after the feature freeze: `docs/postman/` collection + README paragraph |
| Elastic | 14-day trial (+30 self-extension); asks for a multi-step agent using Elasticsearch with Jina embeddings | Low | Skip |
| KERNEL | Browser infrastructure for agents; $50 credits | Low (real courier integration is out of scope) | Skip |
| Astropods | Agent operating system; free account | Low | Skip |
| Zapier | 14-day Professional trial; Zapier MCP | Low | Skip |

## Owner actions (only when the related build starts)

- AG Studio: Discord question now; trial registration 7-8 Nov; key in `.env`.
- Render: create an account (GitHub login) and claim the $50 credits when deploying.
- APIMatic: claim the free subscription form only if the plugin is actually used.
- Never paste keys or licence codes into chat or the repo.
