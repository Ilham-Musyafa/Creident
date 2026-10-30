# C36 — QA walkthrough and claims scan

Date: 2026-10-30. Base: `origin/main` at `e60078e` (PR #98 included). Branch: `docs/qa-report-c36`. Report only; no application, test, data, or configuration files changed.

## Summary

| Severity | Count | Scope |
| --- | ---: | --- |
| Blockers | 1 | Three deal detail screens become difficult to read at 390 px. |
| Should fix | 5 | Stale evaluation claims, two console errors, one misleading count, and evidence wording. |
| Nice to have | 1 | Development image loading warning. |

In a local simulated-payment and recorded-AI session, I seeded 13 demo deals through Settings and completed two paths: a new deal through buyer approval, seller tracking, buyer receipt and completion; and a seeded deal through dispute, both parties' evidence, reviewer refund decision, and its 14-step verified deal history. The new deal form accepted category, subcategory, condition and price. Copying the buyer link placed the checkout URL on the clipboard. No live payment occurred.

I visited 16 requested routes across Seller, Buyer and Reviewer, at 390 px and 1440 px, in light and dark themes (192 browser navigations). All 180 full-page responses were HTTP 200; 12 hash-only `/about#limitations` navigations did not issue a document request, and the target was visible in all 12. Automated checks found no document-level horizontal overflow. Core flow actions worked. The known double Settings highlight on `/how-it-works` and `/reviewer/oversight` is being addressed in C35 and is **not counted** here.

## Blockers

1. **Deal subpage header is compressed at phone width.** Pages: `/deals/[id]/evidence`, `/review`, `/decision`; all roles, 390 px, light and dark. The status chip keeps its width while the heading gets a very narrow column. The title wraps into several lines and the subtitle is hard to read; the chip intrudes on the top content. Reproduce: open any of those pages for a decided demo deal at 390 px. Source: `src/components/layoutPrimitives.tsx:6-18`, used by the three pages. Suggested fix: place the status below the heading on small screens and give the heading the full available width.

## Should fix

1. **README and design document describe an obsolete evaluation as the current report.** Files: `README.md:327-355`, `docs/DESIGN.md:529-536`; every role and size. Both point to `eval/report.md` and `eval/results.json` but describe the older 50-case run and its 0/23, 0/300, 100/100, 23/50 and 27/27 results. The committed report now has 62 cases and different denominators, including 35/37 non-escalated agreement. Reproduce: compare those sections with `eval/report.md:3-20`. Suggested fix: state the current 62-case replay results and limitations, or explicitly call the 50-case results historical.
2. **Review desk emits browser console errors without an AG Studio license.** Page: `/reviewer/oversight`; Reviewer, 390 and 1440 px, light and dark. The embedded studio logs license errors (14 error-severity messages per sampled view). Reproduce: open Review desk in this local no-license demo. Source: `src/components/oversight/StudioDashboard.tsx`. Suggested fix: provide the approved license in the demo environment or show a clear read-only fallback when it is unavailable; do not expose the key.
3. **Seeded Seller Home emits a React duplicate-key error.** Page: `/`; Seller, 390 and 1440 px, light and dark. React reports duplicate key `seller`, with a development issue indicator. Reproduce: load demo deals, switch to Seller, open Home and inspect the console. Source: `src/app/page.tsx:45` gives both sibling Home components `key={role}`. Suggested fix: remove unnecessary sibling keys or make them unique.
4. **Home's “Completed” count includes other closed outcomes.** Page: `/`; all roles, 390 and 1440 px, both themes. The seeded Home showed 6 “Completed” deals while only 2 were `COMPLETED`; the other 4 were voided/cancelled. The tile actually opens the `closed` filter. Reproduce: load demo deals and compare the tile with the Transactions Closed list. Source: `src/app/page.tsx:39`, `src/components/transactionsView.ts:63`. Suggested fix: label the tile “Closed” to match the existing filter, or use a true completed-only count if product scope permits.
5. **Evidence instructions contradict the available chat input.** Page: `/deals/[id]/evidence`; all roles, 390 and 1440 px, both themes. It says “Only in-platform chat counts as chat evidence,” but the form accepts a pasted “Chat excerpt” and there is no built-in chat. Reproduce: open Evidence and compare the explanatory line with the input option. Source: `src/app/deals/[id]/evidence/page.tsx:66`, `src/components/client.tsx:176`. Suggested fix: describe accepted pasted excerpts accurately without changing evidence handling.

## Nice to have

1. **Development LCP warning for the dark wordmark image.** Several mobile pages, 390 px, both themes; 16 of 192 navigations logged this warning. The image renders, and no production performance check was made. Reproduce: open mobile pages with browser console on `npm run dev`. Source: `src/components/BrandLogo.tsx:7`. Suggested fix: consider eager loading or `priority` for the above-the-fold logo if measurement confirms it helps.

## Claims scan

Search scope: `README.md`, `docs/`, and `src/` text and comments. Literal terms checked case-insensitively: `trustless`, `tamper-proof`, `tamper proof`, `collusion-free`, `unbiased`, `absolute`, `no human`, `PayPal holds`, `escrow`, `legal`, `compliant`, `licensed`, and `first in the world`. There were **38 literal matches** in 21 files. Every literal match was a clear denial or prohibition, a factual note about PayPal policy, a software/font license, or code/CSS syntax; there was **no direct forbidden product claim** in those matches. The table below marks every match. “Absolute” in CSS means positioning, not an absolute claim.

**VIOLATION — statistic stated outside its current measurement scope:** `README.md:327-355` says “The committed report runs in replay mode ... Of 50 expected labels” and gives 50-case rates, then says those same numbers are shown on `/fairness`. `docs/DESIGN.md:529-536` says “Current measurement ... 50 synthetic cases” and repeats them. The referenced committed report and Fairness page use a newer 62-case run. See Should fix #1. The old 50-case run was real, but its presentation as the current report is inaccurate.

**UNSURE — scope of AI testing:** `README.md:70` says “the AI step is tested for bias and prompt injection.” Other README sections disclose that the committed check is replay only. A first-time reader may infer a live-model test. Suggested wording: explicitly say the replay harness tests the rules and injection flag, while live-model evaluation remains pending.

### Literal-match inventory

| File:line | Matched sentence or code context | Assessment |
| --- | --- | --- |
| `README.md:19` | > This is a hackathon prototype. It is not an escrow service, it does not hold | OK — denial, prohibition, or factual PayPal policy context. |
| `README.md:507` | where required (its Acceptable Use Policy lists escrow services and marketplaces as | OK — denial, prohibition, or factual PayPal policy context. |
| `docs/DESIGN.md:21` | What it is **not**: an escrow service, a payment provider, or a system without a | OK — denial, prohibition, or factual PayPal policy context. |
| `docs/DESIGN.md:27` | regulatory review in Indonesia. PayPal's Acceptable Use Policy lists escrow services | OK — denial, prohibition, or factual PayPal policy context. |
| `docs/HANDOFF.md:155` | console warnings until licensed). Results are announced 21 Dec 2026, so the owner registers | OK — software/font license context, not a licensed-service claim. |
| `docs/HANDOFF.md:290` | v3. OG absolute URLs derive from current request host/protocol, not invented URL. | OK — CSS/code positioning or URL form, not a product claim. |
| `docs/SANDBOX-NOTES.md:141` | - PayPal's Acceptable Use Policy lists escrow services and marketplaces as requiring | OK — denial, prohibition, or factual PayPal policy context. |
| `docs/UI.md:156` | - Say "Authorized via PayPal, not yet captured" or "funds reserved", never "PayPal holds | OK — explicitly forbidden wording. |
| `docs/UI.md:159` | - Say "dispute-mediation prototype", never "escrow service". | OK — denial, prohibition, or factual PayPal policy context. |
| `docs/brand/index.html:1` | …:#eef6ff;color:#0B1F4B;font-family:DM,Arial,sans-serif}.card{position:absolute;background:white;border-radius:24px;display:flex;align-items:center;justify-content:center}.wl{left:26px… | OK — CSS/code positioning or URL form, not a product claim. |
| `docs/reports/C26-submission-polish.md:28` | matches in context: software-license wording (“until licensed”), prohibitions, | OK — software/font license context, not a licensed-service claim. |
| `docs/ui/mockup-source.html:52` | .hero:after{content:"";position:absolute;right:-50px;top:-50px;width:160px;height:160px;border-radius:50%;background:var(--accent);opacity:.12} | OK — CSS/code positioning or URL form, not a product claim. |
| `docs/ui/mockup-source.html:74` | .nav{position:absolute;left:0;right:0;bottom:0;height:80px;background:var(--surface);border-top:1px solid var(--line);display:flex;justify-content:space-around;align-items:flex-start;padding-top:12px} | OK — CSS/code positioning or URL form, not a product claim. |
| `docs/ui/mockup-source.html:82` | .st:not(:last-child):before{content:"";position:absolute;left:11px;top:24px;bottom:0;width:2px;background:var(--line)} | OK — CSS/code positioning or URL form, not a product claim. |
| `docs/ui/mockup-source.html:202` | <div class="rule" style="margin-top:14px;background:var(--surface-2);border-color:var(--line);color:var(--muted)">Sandbox demo. HalcyVault is a dispute-mediation prototype, not an escrow service.</div> | OK — denial, prohibition, or factual PayPal policy context. |
| `docs/ui/mockup-source.html:222` | …ication','Check the hash chain'],['Limitations','Sandbox demo, not an escrow service'],['About HalcyVault','PayPal AI Hackathon 2026']].map(m=><div class="mi"><div class="ic"></div>… | OK — denial, prohibition, or factual PayPal policy context. |
| `src/app/globals.css:171` | .desktop-transaction-search label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } | OK — CSS/code positioning or URL form, not a product claim. |
| `src/app/globals.css:180` | content: ''; position: absolute; z-index: -1; pointer-events: none; | OK — CSS/code positioning or URL form, not a product claim. |
| `src/app/globals.css:276` | content: ''; position: absolute; left: 4px; top: 16px; | OK — CSS/code positioning or URL form, not a product claim. |
| `src/app/globals.css:281` | content: ''; position: absolute; left: 9px; top: 30px; bottom: -16px; | OK — CSS/code positioning or URL form, not a product claim. |
| `src/app/how-it-works/page.tsx:17` | {i < steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-5 top-10 w-px bg-line"/>} | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/DemoGuide.tsx:59` | …ey moves. Reviewer actions may require an access code. This is not an escrow service.</p> | OK — denial, prohibition, or factual PayPal policy context. |
| `src/components/MobileHome.tsx:32` | …on name={icon}/>{count !== undefined && count > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibol… | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/MobileTransactions.tsx:35` | …24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-4 top-3.5 size-5 text-muted"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input id="… | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/MobileTransactions.tsx:39` | …troke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-4 top-3.5 size-5 text-[var(--inspection-text)]"><rect x="3" y="3" width="7" height="7" rx="1.5"/><r… | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/MobileTransactions.tsx:41` | <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute right-4 top-4 size-4 text-muted"><path d="m6 9 6 6 6-6"/></svg> | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/ThemeSelector.tsx:50` | {preview && active && <span aria-hidden="true" className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-strong text-on-strong"><svg viewBox="0 0 24… | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/TransactionsBrowser.tsx:38` | …trokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3 top-3 size-5 text-muted"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg> | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/client.tsx:276` | {open && <div role="menu" className="hv-page absolute right-0 z-30 mt-2 w-56 rounded-[14px] border border-line bg-surface p-1 shadow-lg"> | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/client.tsx:281` | {error && <div className="absolute right-0 mt-14 w-64"><ErrorNote error={error}/></div>} | OK — CSS/code positioning or URL form, not a product claim. |
| `src/components/motion.tsx:68` | <span key={i} className="absolute size-2 rounded-[2px]" | OK — CSS/code positioning or URL form, not a product claim. |
| `src/fonts/DM-Sans-OFL.txt:3` | This Font Software is licensed under the SIL Open Font License, Version 1.1. | OK — software/font license context, not a licensed-service claim. |
| `src/fonts/DM-Sans-OFL.txt:19` | The OFL allows the licensed fonts to be used, studied, modified and | OK — software/font license context, not a licensed-service claim. |
| `src/fonts/OFL.txt:3` | This Font Software is licensed under the SIL Open Font License, Version 1.1. | OK — software/font license context, not a licensed-service claim. |
| `src/fonts/OFL.txt:19` | The OFL allows the licensed fonts to be used, studied, modified and | OK — software/font license context, not a licensed-service claim. |
| `src/fonts/Outfit-OFL.txt:3` | This Font Software is licensed under the SIL Open Font License, Version 1.1. | OK — software/font license context, not a licensed-service claim. |
| `src/fonts/Outfit-OFL.txt:19` | The OFL allows the licensed fonts to be used, studied, modified and | OK — software/font license context, not a licensed-service claim. |
| `src/fonts/README.md:8` | The Fontsource archive was used only to obtain the licensed asset; no package was | OK — software/font license context, not a licensed-service claim. |

No literal matches appeared for `trustless`, `tamper-proof`, `tamper proof`, `collusion-free`, `unbiased`, `no human`, `legal`, `compliant`, or `first in the world`. The scan is lexical and does not prove that all possible implied claims were found.

## Security check

- `npm audit --json`: **0** critical, high, moderate, low, or informational vulnerabilities reported for the installed dependency tree.
- Scanned 890 tracked working-tree files for common key/token formats, private-key blocks, PayPal live endpoints, and credential assignments. No actual committed secret was identified. Three credential-looking assignments inspected were synthetic test values in `src/app/api/paypal/disputes/bridge.test.ts:45`, `src/app/api/routes.test.ts:525`, and `src/lib/reviewerAccess.test.ts:10`; their values are intentionally omitted here. The PayPal live host appears only in refusal tests (`scripts/dispute-probe.test.ts:62`, `scripts/sandbox-smoke.test.ts:101`). A private-key marker appears only in an audit unit-test assertion (`src/lib/audit/checkpoint.test.ts:72`). Pattern scanning cannot prove the absence of unknown secret formats.
- `.env` is ignored by `.gitignore:2` and is not tracked. I did not open or print it. `.env.example` contains variable names and empty assignments, except a public PayPal Sandbox base URL; no credential value was found there.

## What I could not check

- PayPal Sandbox or live payments, live AI, and the licensed AG Studio experience. This run used simulated payments and recorded AI replies only.
- Every secondary button and link on every view, all possible dispute/return outcomes, and a complete keyboard/accessibility audit. The core paths and requested routes above were checked.
- Production runtime behavior. The browser run used `npm run dev`; development-only console notices may differ after a production build.
- A pixel-by-pixel review of all 192 views. Automated checks covered navigation, console, and horizontal overflow; representative screenshots were reviewed visually.
