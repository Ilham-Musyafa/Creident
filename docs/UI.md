# UI.md — Creident visual guide

Status: **Sapphire Flow, owner-approved 2026-10-23** via
[`brand/Creident_Brand_Guidelines.pdf`](brand/Creident_Brand_Guidelines.pdf).
This replaces the earlier Midnight Ink + Mint identity. Older mockups/screenshots are
historical references; the supplied brand kit and this updated guide describe the current
identity. Functional component patterns, plain-language copy and accessibility still apply.

Goal: **clean, modern, simple, fast, and still attractive.**

## 1. Principles

1. One main action per screen, in Sapphire Blue. Everything else is neutral.
2. Money and status first: the amount and the current status are readable at a glance.
3. Status always has a **text label** (and ideally an icon). Never colour alone.
4. Explain, do not hide: show what happens to the money next and what the AI did and did not do.
5. Fast: no UI component library, no heavy animation, inline SVG UI icons, locally hosted variable fonts and small source-derived brand PNGs.

## 2. Design tokens

All colours are CSS variables. **Never hard-code a hex value in a component.**
To change the brand later, edit the token values only (one place: `src/app/globals.css`).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#F7FAFF` | `#07142F` | Page background |
| `--surface` | `#FFFFFF` | `#0B1F4B` | Cards, inputs, nav |
| `--surface-2` | `#DBEAFE` | `#122F63` | Chips, segmented control, subtle fills |
| `--line` | `#D4DFEF` | `#284674` | Borders, dividers |
| `--text` | `#0B1F4B` | `#DBEAFE` | Body text |
| `--muted` | `#465A78` | `#A9BCD6` | Secondary text |
| `--heading` | `#0B1F4B` | `#F1F6FF` | Headings, back links, active nav |
| `--hero` | `#0B1F4B` | `#102C60` | Amount card background |
| `--hero-text` | `#FFFFFF` | `#FFFFFF` | Text on the amount card |
| `--hero-sub` | `#93C5FD` | `#93C5FD` | Secondary text on the amount card |
| `--accent` | `#3B82F6` | `#3B82F6` | Main action (Sapphire Blue) |
| `--on-accent` | `#07142F` | `#07142F` | Darkened navy text/icon on sapphire for AA contrast |
| `--strong` | `#0B1F4B` | `#93C5FD` | Strong secondary action (e.g. Refund) |
| `--on-strong` | `#FFFFFF` | `#0B1F4B` | Text on `--strong` |

The exact source palette is Midnight Navy `#0B1F4B`, Sapphire Blue `#3B82F6`,
Sky Blue `#93C5FD`, and Ice Blue `#DBEAFE` (`--brand-*` variables). Background,
muted and dark-mode values are supporting UI adaptations, not additional logo colours.
The source logo pixels are never recoloured. Normal action text uses `#07142F` because
white and the exact source navy do not reach 4.5:1 on Sapphire Blue. Semantic status
and notice colours below retain distinct meanings and are not logo colours.

Status tokens (background / text):

| Status | Light | Dark |
| --- | --- | --- |
| Awaiting approval | `#FEF3C7` / `#B45309` | `rgba(245,158,11,.16)` / `#FCD34D` |
| Authorized | `#E0E7FF` / `#4338CA` | `rgba(99,102,241,.20)` / `#A5B4FC` |
| Inspection | `#DBEAFE` / `#1D4ED8` | `rgba(59,130,246,.18)` / `#93C5FD` |
| Disputed / under review | `#FFE4E6` / `#BE123C` | `rgba(225,29,72,.18)` / `#FDA4AF` |
| Completed | `#D1FAE5` / `#047857` | `rgba(16,185,129,.16)` / `#6EE7B7` |
| Frozen by PayPal | `#EDE9FE` / `#6D28D9` | `rgba(124,58,237,.20)` / `#C4B5FD` |
| Voided / cancelled / refunded | `#F1F5F9` / `#475569` | `rgba(148,163,184,.14)` / `#CBD5E1` |

Notices: warning (rule/escalation) `#FFF7ED` / border `#FED7AA` / text `#9A3412`;
success (chain verified) `#ECFDF5` / border `#A7F3D0` / text `#065F46`. Dark versions are in
the mockup source (`rgba` of the same hue, lighter text).

Mapping from `TxStatus` (src/lib/domain/types.ts) to labels:

| TxStatus | Label | Token |
| --- | --- | --- |
| DRAFT | Waiting for agreement | void |
| TERMS_LOCKED | Agreed · ready to pay | completed |
| AWAITING_APPROVAL | Waiting for payment | awaiting |
| AUTHORIZED | Payment approved · not charged yet | authorized |
| SHIPPED | Shipped | inspection |
| IN_INSPECTION | Delivered · checking | inspection |
| DISPUTED | Problem reported | disputed |
| UNDER_REVIEW | Being reviewed | disputed |
| FROZEN_EXTERNAL | On hold · PayPal dispute | frozen |
| COMPLETED | Completed | completed |
| REFUNDED | Refund issued | void |
| PARTIALLY_REFUNDED | Partial refund issued | void |
| VOIDED | Cancelled · not charged | void |
| CANCELLED | Cancelled | void |

## 3. Light, dark and system mode

- Three options in Menu > Appearance: **Light, Dark, System** (default System).
- Implement with a `data-theme` attribute on `<html>` and the token sets above
  (`:root` = light, `[data-theme="dark"]` = dark, `prefers-color-scheme` for System).
- Store the choice in `localStorage` (per-viewer convenience only; wrap in try/catch).
- Set the attribute with a tiny inline script in `<head>` before paint to avoid a flash.
- Sapphire Blue and its dark navy button text stay the same in both modes. Supporting surfaces adapt.

## 4. Typography

- Owner-approved application typography update (2026-10-23): **Plus Jakarta Sans** for
  page and card headings; **DM Sans** for body, labels, navigation, buttons, tables and numbers.
- Both use local Latin variable WOFF2 files through `next/font/local`, preloaded with
  `display: swap` and Arial/sans-serif fallbacks. No runtime Google Fonts requests.
- The brand signature remains **Georgia Regular** with its **Arial** tagline, as supplied.
- Page titles: 28px on mobile / 32px from the small breakpoint; subheads 15px/700.
- Monospace (hashes, codes): system `ui-monospace`.
- Scale: amount 32/800 (tight letter-spacing), section 15/700,
  body 14/400–600, caption/label 12/400–700, pills at least 12/700.
- Explanatory paragraphs, transaction subtitles and form help use 14px or larger.
  Compact navigation, status labels and technical fingerprints use at least 12px.
  Brand wordmark/tagline retain the supplied Georgia/Arial treatment (tagline 12px).
- Use tabular numbers for money (`font-variant-numeric: tabular-nums`).

## 5. Shape, spacing, elevation

- Radius: inputs 14px, list items 18px, cards 22px, amount card 26px, buttons and pills full.
- Spacing on mobile: 20px side padding, 8–12px between list items, 16–20px between sections.
- Tap targets at least 44px high. Buttons 46px.
- Elevation: borders first; a soft shadow only on the floating action button and phone-level
  overlays.

## 6. Components

| Component | Notes |
| --- | --- |
| `Button` | Variants: `accent` (main action, one per screen), `ghost` (bordered), `strong` (navy, e.g. Refund). Full-width option. Visible focus ring. |
| `StatusPill` | Dot + label from the mapping above. Optional suffix such as "1d 4h left". |
| `AmountCard` | Navy card, label "Authorized via PayPal, not yet captured" style wording, big amount, 3 stat tiles, one Sapphire Blue action. |
| `DealListItem` | Icon tile tinted with the status token, title, status pill, amount right-aligned. |
| `Timeline` | Steps: done (filled heading colour + brand-coloured check), current (inspection token), upcoming (outline). |
| `KeyValue` | Label/value rows with dashed dividers (fees, ids). |
| `FindingCard` | Criterion, "Supports buyer / Supports seller / Unclear" pill, evidence chips (E1, E3...). |
| `RuleNotice` | Warning notice naming the rule (R1–R7) and stating the AI cannot move money. |
| `AuditEvent` | Sequence number, event title, mono line with actor, time, previous hash. |
| `ChainStatus` | Success notice "Chain verified · N events" + head hash; error state when broken. |
| `Field` / `Input` | Label above, 44px input, placeholder in muted. |
| `SegmentedControl` | Used for role switch (demo) and appearance. |
| `BottomNav` | Mobile: Home, Transactions, Records, Settings, with text labels; no New/FAB tab. Desktop (≥1024px): persistent 248px navy sidebar, route-aware main/Learn links, existing demo-role card and per-page top bar. Main content max-width 1200px. Skip-to-content and visible keyboard focus. Supersedes the 2026-10-23 hamburger drawer; mobile geometry is unchanged. |
| `CodeBadge` | One-time evidence code in mono, e.g. `HV-1042 · 7K2Q`. |

## 7. Screens (see mockups)

1. Home (role-aware: seller/buyer/reviewer). With no deals, show a compact getting-started card instead of the amount and zero stats; hide Recent deals / See all. Keep the desktop New navigation neutral so the page action is primary. Use a compact Sandbox badge and a Limitations link.
2. Deal detail with timeline, fees, actions
3. Dispute review (AI findings, rule notice, reviewer decision with required reason)
4. Audit log with chain verification
5. New deal (seller): terms, in-app photos, ship-by and inspection windows, fee estimate
6. Buyer checkout: terms locked + hash, "How it works" in 3 steps, Sandbox notice,
   "Continue to PayPal (Sandbox)"
7. Add evidence: one-time code, in-app photo only, submitted items with content hash
8. Menu: group demo role, appearance (Light/Dark/System), optional reviewer code, and
   demo data under "Demo settings" in one divided card. Group "How decisions work",
   "Audit & verification", fairness results, "Limitations", and "About" under
   "About & transparency". Selected segments have a visible border and aria-pressed.

Time values (3 days ship-by, 2 days inspection, 2 days evidence) and "Fee on refund borne
by: Platform" were decided by the owner on 2026-10-21.

## 8. Copy rules

Follow the claim rules in `AGENTS.md`. In the UI specifically:
- Say "Authorized via PayPal, not yet captured" or "funds reserved", never "PayPal holds
  your money".
- Always show "Sandbox demo" somewhere on payment screens and in Menu > Limitations.
- Say "dispute-mediation prototype", never "escrow service".
- AI text: "AI evidence summary", "The AI only summarises; it cannot release or refund."
- Do not use PayPal's logo or other brand logos; plain text "PayPal (Sandbox)" is enough.

## 9. Accessibility and performance checklist

- Text contrast 4.5:1 or more. Sapphire Blue uses darkened navy text: white on sapphire and the exact brand navy on sapphire fall below AA for normal text.
- Every status, error and success has text, not only colour.
- Keyboard focus visible; buttons are `<button>`, links are `<a>`.
- Respect `prefers-reduced-motion`; transitions under 200ms.
- Use preloaded fonts with adjusted fallbacks to limit font layout shift; images sized and lazy-loaded.
- No console errors or warnings.

## Motion (owner-approved 2026-10-22)

CSS only, no animation library. Transform and opacity only, short (150-450 ms), and all of it
is disabled by `prefers-reduced-motion` (the global rule also zeroes delays and repeats).
Classes live in `src/app/globals.css`; small client pieces in `src/components/motion.tsx`.

- `hv-page`: pages fade and rise in (fill mode `backwards`, so no transform is left on
  `<main>`; a leftover transform would turn fixed overlays into scrolling ones).
- `hv-stagger`: children of deal lists appear one after another (capped at 10 steps).
- `hv-press`: buttons and button links scale slightly while pressed.
- `hv-shimmer`: loading skeletons.
- Timeline: done steps pop in order (`hv-step-done`), the current step pulses a ring.
- Status pills that need action (disputed, awaiting) pulse their dot (`hv-dot`).
- `CountUp`: the Home amount counts up; the final value is the server-rendered text.
- `SuccessBurst`: a check and small confetti, rendered into `document.body`, shown once per
  browser for a success in the last two minutes (payment authorized, deal completed, refund
  or partial refund, decision recorded). Decoration only; the page text states the outcome.
- Audit chain: events reveal in order (`hv-chain-item`, `--i`), each previous-hash flashes
  as the chain links up, then the "Chain verified" box pops (`hv-verified`).

New animations must follow the same limits and must never be the only way information is
shown.

## Back navigation (owner choice, 2026-10-22)

`PageHeader` shows back navigation as a round 44 px icon button (chevron, thin border) on the
left of the page title, with the accessible name "Back". No arrow-and-text link.

## Finance-app patterns (owner-approved 2026-10-22)

Patterns borrowed from banking and payment apps, never their branding:
- **Confirmation sheet** (`ConfirmSheet`): before any action that moves or commits money
  (authorize at checkout, confirm receipt, reviewer release/refund/partial refund/split),
  show the amount large, what happens to the money, and an explicit confirm. Bottom sheet on
  mobile, centred card on desktop; Escape or the backdrop cancels; the sheet closes on
  confirm so errors below the button stay visible. Never use native browser dialogs.
- **Receipt**: the decision receipt starts with a reference (`HV-<deal>-<decision event>`),
  date and amount, and a "Save as PDF" button (browser print; print styles hide navigation).
- **Activity feed** (`ActivityFeed`): the deal page shows the latest events in plain words
  with an icon and relative time; technical events stay in the audit log ("Full audit log").
- **Stepped dispute** (`DisputeSteps`): what went wrong -> what you will need -> check and
  open, with a three-dot step indicator.

## Plain language (owner request, 2026-10-22)

Screens for buyers and sellers use everyday words, like common payment apps. Technical terms
stay available inside initially closed "Technical details" disclosures, including on Records
and receipts, never as the main label. One word per idea across the app. Plain must still be honest: PayPal approves
(authorizes) a payment; it does not "hold your money" (AGENTS.md claim rules).

| Technical | Shown to users |
|---|---|
| Authorized / funds reserved | Payment approved · not charged yet |
| Capture / captured | Payment charged |
| Void / voided | Cancelled · not charged |
| Refund / partial refund | Refund issued / Partial refund issued |
| Inspection | Checking the item |
| Dispute opened | Problem reported |
| Under review / escalate to a human | Being reviewed / Needs a reviewer |
| Frozen by PayPal | On hold · PayPal dispute |
| Simulated | Demo (no real money) |
| Audit log / hash chain | Record / verified (only when the existing checks pass) |
| Hash, head hash, digest | Check values inside Technical details |
| prev hash | Previous step, inside Technical details |
| Checkpoint | Sealed copy |
| Event | Step |
| Replay mode | Recorded test run |


### Shared glossary and truthful copy (2026-10-26)

| Concept | User-facing wording |
|---|---|
| One buyer–seller agreement | deal |
| List page and navigation tab | Transactions; the objects within it are deals |
| Verified history of one deal | record (failed checks must remain explicit) |
| Verification area | Records |
| Start a deal / submit its form | New deal / Create deal |
| Greeting | Hi, {name}; demo names are Demo Buyer, Demo Seller, Demo Reviewer |
| Refund fee policy | fee covered by the platform |
| Reviewer RELEASE action | Charge the buyer (capture) |
| Evidence references | Buyer evidence 1 / Seller evidence 1, numbered separately per side |

- A decision is a choice, not proof a payment succeeded. Both deal summary and
  receipt use `components/decisionCopy.ts`: Payment charged requires stored capture
  success; Refund issued requires stored refund success; cancellation and pending
  states retain their own labels. Never imply seller payout. Policy copy is not a
  fee receipt; amounts use the deal currency. Internal outcome enums stay unchanged.
- `components/ruleCopy.ts` is the shared presentation source for About rule titles
  and descriptions. `RuleLabel` shows the title first, followed by a secondary
  code chip (12px minimum). It does not implement rules. Unknown rules say No rule
  recorded. Show “AI only summarises evidence; a human decides.” once per screen.
- `TechnicalDetails` is a native, initially closed disclosure: exact summary
  Technical details, >=44px target, visible focus, >=14px body, wrapping raw values.
  IDs, hashes, fingerprints, event names, raw PayPal codes and debug IDs belong
  inside it, including within expanded record steps. Plain verification results
  and failure warnings remain outside. Plain error messages come first; preserve
  the original error inside the disclosure for diagnosis.
- Do not rewrite stored evidence, reviewer reasons, AI output or signed/audited
  payloads to change terminology. Evidence labels are view aliases; original
  citation references and provenance remain available in Technical details.
- Mode labels must use the existing simulated/Sandbox flag, not infer mode from
  the presence of a demo item. Keep every simulation marker and every limitation.
- This copy pass changes no navigation or page hierarchy. Screens and the full
  before/after source-copy table: `ui/screens/copy-pass/`.


## Sapphire Flow signature (2026-10-23)

- Use `BrandLogo` for the original two-node C symbol, Georgia wordmark and exact
  tagline **Every deal, on record.** Full lockups have a minimum width of 200px; below
  that width use the symbol only (24px minimum, except supplied favicon sizes).
- Preserve aspect ratio, both nodes and at least one node diameter of clear space.
  The component uses a 48px square source image with 12px surrounding padding/gap.
- Use the PDF's navy-arc symbol on light backgrounds and white-arc symbol on dark
  backgrounds. No shadow, outline, rotation, recolouring or invented vector master.
- Records navigation uses a document icon, not a shield. Do not pair the identity
  with shields, locks or other company logos or imply guaranteed outcomes/custody.
- Asset provenance, raster limits and available favicons/app icons are documented
  in `docs/brand/README.md`. Older screenshot galleries have not all been regenerated.

### Home demo guidance (owner-approved 2026-10-23)

- Mobile first-time visitors see a dismissible product introduction before the dashboard:
  agree on terms → approve with PayPal → rules R1–R7 and human dispute review.
- Seller/Buyer/Reviewer buttons reuse the existing demo role cookie, refresh Home and
  focus the dashboard. This does not unlock reviewer actions or create transactions.
  “Open dashboard” keeps the current role. Reopen with “About this demo”.
- Dismissal uses an optional localStorage preference with a blocked-storage fallback.
  State simulated/Sandbox payment mode, no real money, demo data and access-code limits.
- Show a short role-specific task summary. Sort action cards by the nearest stored
  deadline first, then undated actions; display up to six, with a link to all deals.
- On mobile, show the action queue before recent transactions. These are presentation
  changes only; transaction rules, deadlines and permissions remain on the server.

### New deal form refinement (owner-approved 2026-10-23)

- One-page form grouped into Item details, What’s included and Buyer checks, with
  clear legends and spacing. AI listing assistance stays optional and collapsed.
- Included items and checks use labelled add/remove rows, preserving the existing
  newline-based form state, template merging, draft acceptance and API arrays.
- Transaction summary previews item, USD amount, condition and list counts. Existing
  configured deadlines are shown; fee details are expandable.
- Summary is sticky beside the form on desktop and before the submit action on mobile.
  “Create deal link” explains that both parties must accept before terms lock.
- Review captures: `docs/ui/screens/new-deal/` (390/1440px, light/dark).

Payment wording update (owner-approved 2026-10-23): cancelling an uncharged approval
must never be described as a refund. Pending refunds/returns stay labelled pending.
Technical state/event codes remain intact in APIs, stored data and audit details.

Mobile Home header refinement (owner-approved 2026-10-23): keep the full brand
signature on the left and a compact, labelled avatar/role toggle on the right.
The separate greeting and role-switch instruction remain desktop-only; mobile keeps
an accessible Home heading. Use a 44px minimum target and the existing focus tokens.
The avatar switches Buyer ↔ Seller in place using the existing demo role cookie;
its accessible name/title describes the next role. Reviewer selection stays in Menu;
a reviewer can use the shortcut to return to Buyer. Refresh Home without changing URL.

### About and readability pass (owner-approved 2026-10-23)

- R1–R7 use native keyboard-accessible accordions with short titles and the full rule
  explanation. Rule behavior is unchanged. Audit caveats remain visible.
- Limitations keep a visible demo/no-real-money/no-real-sign-in/no-payout summary;
  remaining details can be expanded. Direct `#decisions`, `#audit` and `#limitations`
  links target visible sections. Link to current evaluation results rather than
  repeating hard-coded case counts that can become stale.
- Retain the selected font pairing, palette, logo, desktop drawer and demo labels.
  No new libraries or decorative animations are needed for this pass.

### Menu & settings refinement (owner-approved 2026-10-24)

- Use settings patterns inspired by shadcn: grouped bordered panels, contextual
  desktop section navigation, consistent inline SVG icons and icon-led link rows.
  Keep Creident's existing palette/fonts/radii; no shadcn or icon package is installed.
- Desktop uses a 224px contextual column for the demo workspace and page anchors;
  mobile stacks the workspace and four panels: Demo role, Appearance, Demo data,
  Learn & verify. This does not replace the selected global navigation drawer.
- Menu uses the optional ThemeSelector preview variant. Miniatures use stable palette
  tokens (`--preview-light-*`, `--preview-dark-*`) so both light/dark examples remain
  visible in either current theme. System is split; selection has a check and
  aria-pressed. The compact styleguide variant and theme persistence stay intact.
- Reuse existing role picker, code gate and seed controls. Clearly label demo roles
  as not real sign-in; show code requirements only when configured. Keep reviewer
  oversight conditional on the reviewer view and enforce access on existing endpoints.
- Review captures: docs/ui/screens/menu-settings/ (390/1440px, light/dark, full page).

Navigation cleanup (owner-approved 2026-10-24): remove the New shortcut from the
shared mobile/desktop navigation. Rename the displayed Menu destination to Settings
with a hand-drawn inline SVG cog; title the page Settings. Keep `/menu` and its
internal active key for existing links. New deal remains reachable from Seller Home
and highlights Transactions. Update role/access instructions to say Settings. The
hamburger opens the global navigation drawer; the Settings row uses the cog.

### Transactions list refinement (owner-approved 2026-10-24)

- Desktop (≥1024px): one aligned list with Item, Status, Next step and Amount columns.
  Mobile uses cards: item/amount, status, then next step and its stored deadline.
  Each row is one keyboard-focusable link to the existing next-action route or details;
  no row click sends a payment or other write request.
- Live item-name search is bounded to 200 characters. Filters All / Needs your action /
  Active / Under review / Closed show counts within the search results. Mobile shortens
  the visible action filter to “Your actions” but retains the full accessible name.
  Query/filter stay in `/deals` URL; old `filter=review` links remain supported.
- Sort own actions first, active before closed, nearest relevant stored deadline next;
  preserve existing order for ties. Reuse `nextAction()` and suppress acceptance prompts
  for a role that already accepted, as Home does. Do not invent money retries.
- Use neutral inline SVG item icons based on the known category or recognizable title;
  unknown items use a package. These are decorative, not verified product attributes.
- Display a separate Demo badge instead of a leading `[Demo]` on this list only. Stored
  names, `demo: true`, simulated events and other audit data stay unchanged.
- Review captures: docs/ui/screens/transactions/ (390/1440px, light/dark, full page).

### Desktop Home progressive disclosure (owner-approved 2026-10-24)

- Scope is desktop (≥1024px); retain the existing mobile Home until its separate pass.
  Take whitespace and paired-card hierarchy from the owner's finance UI references,
  using Creident's palette/type. Do not introduce wallet, APY, earnings, rewards, KYC
  or other metrics/capabilities the prototype does not implement.
- Default Overview shows two cards: approved-but-uncharged payments with the existing
  Active/In dispute/Completed counts, and the current-role action count. Keep the
  primary existing transaction/create/review-queue link and an outlined Review actions
  control. Do not show transaction lists, audit details or product intro automatically.
- A compact Home views group selects Overview / Actions / Recent transactions (or
  Review queue) / Audit. Inactive desktop panels are not rendered. Actions use existing
  role/acceptance facts and stored deadlines; recent rows open details. Preserve
  visible Demo badges and existing routes. Audit failures remain a visible warning.
- About this demo explicitly opens the existing introduction within Home; dismissal
  returns to Overview with focus. It has separate IDs and does not change the mobile
  introduction preference. Demo role choices reuse the existing cookie/code gates.
- Keep a quiet payment-mode/no-real-money footer and Limitations link visible in all
  desktop views. Reload starts on Overview. No new dependency or payment action.
- Review captures: docs/ui/screens/desktop-home/ (1024/1440, light/dark; Overview and
  example Actions views). Mobile regression was checked against pre-change captures.

### Mobile reference foundation (owner-approved 2026-10-24)

- Below 1024px, use the owner's main mobile finance reference for soft gradient cards,
  rounded grouped lists, segmented filters and a quiet bottom bar. Retain Creident's
  logo, Sapphire Flow palette, local type and actual transaction facts. Banking balances,
  spending charts, income/expense, budgets and notification counters are not implemented.
- Home starts with Overview, a gradient approved-but-uncharged payment card and the
  first two current-role actions. See all opens more actions; About opens the existing
  product guide on request. Keep the direct Buyer/Seller role switch, real creation/
  review links, count tiles and server chain-check summary. Failed checks remain visible.
- Mobile Transactions groups actual rows by Needs your action / In progress / Closed;
  do not invent event dates. Quick tabs are All / Your actions / Closed. The native
  expandable Filters control includes all five existing filters and search-aware counts.
  Search/filter URL behaviour and the existing next-action routes remain unchanged.
- Rows use category icons, actual amounts, readable status labels and separate Demo
  badges. Stored demo flags/names/events remain intact. Pending refund verification
  remains visible; no UI action triggers money movement by opening a row.
- Keep four bottom destinations: Home / Transactions / Records / Settings. Do not
  restore the central New button removed earlier by the owner. The active icon gets
  a soft pill, with safe-area padding for device navigation.
- Components share presentation data and mobile rows; no new dependencies. Desktop
  Home and Transactions retain their current appearance at 1024px and above.
- Review captures: `docs/ui/screens/mobile-reference/`, 390px light/dark, expanded
  capture height to keep the fixed bottom bar from obscuring full-page content.

### NexoBank-inspired mobile Home (owner reference, 2026-10-24)

- Supersedes the earlier gradient-card mobile Home composition. Reference is the
  owner's screenshot from NexoBank, Figma Community file `1536346965435909007`.
  Borrow hierarchy and spacing; use Creident's logo/fonts and original CSS Sapphire
  waves. No reference artwork, banking labels, contact photos or banking functionality.
- Full-width branded header, compact existing role toggle, rounded surface panel,
  approved-but-uncharged USD amount with a local show/hide toggle, four shortcuts
  (Actions, Browse, Records, About), and one role-appropriate primary action.
- Buyer with pending actions opens the existing action list; Seller creates a deal;
  Reviewer opens the existing review queue. Actions and About replace the panel
  content on demand. View focus uses preventScroll to avoid jumping the header.
- Compact actual Active/In dispute/Completed counts replace the reference's contact
  transfer row. Show up to three recent transactions, or reviewer queue rows, with
  real status/amount and Demo badges. Keep pending-refund verification text even in
  compact rows. Audit checks, failures and payment-mode limitations remain visible.
- Mobile navigation is a navy floating pill with all four existing labels and active
  state, minimum 64px link height and device safe-area spacing. No central New button.
  Applies consistently to mobile routes; desktop drawer styles remain unchanged.
- No new dependency, rule/state/payment/auth/API change. Review captures:
  `docs/ui/screens/nexo-home/` (390px, light/dark viewport and full page).

### NexoBank-inspired mobile Settings (owner reference, 2026-10-24)

- Settings shares Home's original Sapphire wave header and compact role control via
  `MobileBrandHeader`. Use a full-width rounded panel, 28px Settings title and seven
  outlined rows with readable labels, blue icons and chevrons. The existing floating
  navigation highlights Settings. Desktop Settings keeps its current layout.
- Demo role, Appearance and Demo data are native disclosures, initially closed;
  browsers supporting named details open one at a time. Reuse the actual role picker,
  reviewer code form, theme picker and seed action. Reviewer oversight is an additional
  row in Reviewer view. Other rows open the existing decisions/fairness/limits/About
  pages. Deal records remain accessible from the bottom navigation.
- Do not add fictional personal details, security, notifications, language, account
  deletion or log-out actions. This prototype has demo-role selection, not real sign-in.
- Give the mobile reviewer form a distinct input ID. Both theme pickers observe the
  shared document theme so selection stays correct across viewport changes. No new
  dependencies, authentication, rule or payment behaviour.
- Review captures: `docs/ui/screens/nexo-settings/` (390px viewport/full page, light/dark).

### NexoBank-inspired mobile Transactions (owner reference, 2026-10-24)

- Adapt the owner's Analytics screenshot to transaction management: shared Sapphire
  header, rounded full-width panel, view selector, summary card, segmented quick filters
  and grouped rows. Retain the actual title Transactions. No invented expenses, signed
  cash flows, dates, bank cards, categories/tags or percentage breakdowns.
- Summary shows the visible row count with its filter label. The action notice and
  Active/Closed shortcuts count all searched rows, so selecting a status does not hide
  other useful workspace counts. Every shortcut uses the existing filter semantics.
- Search opens with the header search icon; existing URL queries open it automatically.
  Keep the 200-character bound, case-insensitive item search, query-aware counts,
  URL persistence and keyboard-accessible native view selector (all five filters).
- Keep grouped Needs your action / In progress / Closed lists, existing next-action
  links, real amounts/status/deadlines, Demo badges and pending-refund notices. Both
  mobile and desktop retain the empty-list seed action. No row-opening money writes.
- `/deals` explicitly opts into full-width mobile composition. New/detail/checkout and
  other deal pages keep normal page padding. Desktop Transactions keeps its table
  layout, filters and search. No new dependencies or domain/payment/auth changes.
- Review captures: `docs/ui/screens/nexo-transactions/`, 390px viewport/full page,
  light/dark, alongside the matching Home and Settings captures in this branch.

### Compact demo-role dropdown (owner-approved 2026-10-24)

- Replace the mobile header's avatar/direct toggle with a compact `Buyer`, `Seller`
  or `Reviewer` pill and chevron. Open a three-option menu with short descriptions
  and a check on the current role. Selecting the current role only closes the menu.
- Reuse the existing demo-role cookie and refresh the current page. Preserve the
  Transactions URL query/filter and all reviewer code checks. Selecting Reviewer is
  demo navigation, not authentication or an access-code bypass.
- Native auto popover renders above the clipped decorative header. Keep it inside
  viewport bounds with available-height scrolling; dismiss outside, on Escape, page
  scroll, resize or desktop breakpoint. Support arrows/Home/End and Tab, with focus
  returned to the pill after selection even when the role-keyed view is replaced.
- Minimum 44px pill and 64px options, readable descriptions, theme tokens and visible
  keyboard focus. No dependency or new API. Latest header/menu captures supersede the
  avatar shown in earlier screenshots: `docs/ui/screens/role-dropdown/`.

### NexoBank-style mobile Records (owner-approved 2026-10-25)

- `/audit`, `/audit/[id]` and `/audit/how-it-works` use `RecordsShell`: the shared
  MobileBrandHeader/role dropdown and a 32px rounded panel below 1024px. Reuse existing
  typography, colours, floating navigation and safe-area handling. Desktop retains
  its original PageHeader, layout and record rows.
- Mobile list title is Records. The summary shows existing verified/failed record
  counts and verification scope/checkpoint caveats. Failures use an icon, text and the
  existing affected-record action. How verification works is a full-size icon row,
  including when the list is empty. Preserve the existing EmptyState within the panel.
- Mobile record links use item icons, actual status chips, Demo badges and actual step
  counts/failure points. Failed records still sort first. Whole rows are focusable
  links; desktop retains its previous labels and structure.
- Mobile detail returns to `/audit`, keeps RecordMenu/CSV and uses the existing
  ChainStatus. AuditEvent elements retain their order, IDs, failure states and native
  expandable technical details. Mobile-only CSS adds a timeline spine, 44px summary
  targets, visible focus and readable later-step text. Hashes remain secondary.
- Explainer copy, audit verification/signing, API/domain/payment/rules/deadline behaviour
  are unchanged. No dependencies. See `docs/ui/screens/nexo-records/` for list/detail/
  explainer, failed-state captures and the desktop pixel-comparison evidence.


### Mobile Creident concept refinement (owner-approved concept, 2026-10-26)

- Below 1024px, Home puts approved (authorized, not charged) USD payments in the
  navy-to-Sapphire header. Keep local Plus Jakarta Sans headings/amounts, DM Sans
  text and original serif wordmark/symbol. Use the Demo badge, existing role
  dropdown, 44px eye control and two real role/Browse header pills.
- The original named concept files were absent, then the owner supplied generic
  finance inspiration followed by the actual Creident light/dark five-screen concept
  sheet and close-ups. Those Creident images are the primary reference, archived
  in `ui/reference/creident-mockup/` with Home crops and provenance. Example data
  and nonexistent features are never part of the application.
- `MobileBrandHeader` defaults to compact for inner pages and accepts hero content
  for Home. Original CSS waves are subdued behind readable text. Colours/overlap/
  radius/tile settings live in globals.css tokens. New `MobilePanel` extracts four
  previously duplicated wrappers: 28px top corners/overlap, soft mobile background
  and the same desktop transparent wrapper overrides.
- Home tiles are Actions (real count badge), Browse, Records and About. The latter
  two local views retain the existing on-demand behavior and keyboard focus. The
  inline next-task card uses the first existing sorted role task, item/deadline,
  icon and one primary link on the right. Seller creation remains in the header.
  Buyer “Inspect now” opens the existing confirm/dispute details; no money moves.
- Your deals groups up to three demo-party-linked rows (buyerId `buyer`, sellerId
  `seller`; Reviewer uses the actual UNDER_REVIEW queue; never pad it). Prioritize
  needs-action, then active, preserving repository recency within each priority.
  Desktop keeps its existing list. Reuse MobileTransactionRow in compact mode with square icons,
  local heading-font amounts, text chips and short real deadlines. Full deadlines
  remain in title text; absent dates/deadlines are omitted. Demo labeling remains
  visible in the header/footer and as a separate 12px Demo badge on every demo row.
  The compact authorized chip reads “Approved · not charged”, with the existing
  full label in its title. Internal statuses and ordinary/desktop labels are intact.
- Shared StatusPill semantic mobile tones: completed → success; awaiting/frozen →
  warning; disputed → danger; authorized/inspection → info; void → neutral. No status
  is represented by colour alone. Desktop retains its original tones and spacing.
- The floating safe-area dock keeps four tabs, no center +. Active icon and label
  share a Sapphire pill with AA dark text (a deliberate contrast adaptation from
  the concept). Body text is 14px+, small meta/chips 12px+, Home taps 44px+. Long
  real labels can use more space than the concept; preserve readability over fitting
  all content into one viewport. No dependency or external font requests are added.
- Footer uses actual verified/total record checks and labels server scope. Failure
  remains an alert plus warning/partial count, never a false all-verified summary.
  Empty state retains the existing labelled-demo seed control and mode limitations.
- Transactions/Settings/Records inherit shared header/panel/status/nav presentation;
  their content layouts/filters/controls are unchanged. All four desktop pages at
  1440px remain pixel-identical across three roles and both themes. Captures and
  browser/comparison evidence: `ui/screens/creident-home/`.


### Persistent desktop shell (owner-approved, 2026-10-26)

- Supersedes previous desktop drawer references above. Scope is only the shell at
  1024px and up. Keep page bodies and the completed mobile Home composition intact.
  Reference originals: `ui/reference/creident-mockup/desktop/` from the owner's ZIP.
  Example balances, names, dates, hashes, global search and content dashboards are
  not copied. The existing serif wordmark/local fonts and source palette remain.
- `AppShell` reads the same request demo-role cookie as pages and passes role/mode
  to `DesktopNavigation`. Navy sidebar is fixed, 248px, with original four primary
  destinations and active Sapphire icon/label pill using AA dark text. Learn links
  use existing About/decisions, Fairness, Limitations and About routes/anchors.
  Primary/secondary selection follows the pathname/hash, including history changes.
- Bottom role card reuses QuickRoleSwitch (Viewing as + role). Its native menu can
  open above the card, with keyboard controls and return focus. Hidden mobile/desktop
  triggers cannot consume each other's focus restoration. Reviewer code requirements
  remain enforced by the existing pages/APIs; the role card is not authentication.
  Show the actual simulated/Sandbox notice. No transaction badge is fabricated:
  AppShell has no existing shared action count, so the optional badge is omitted.
- Top bar supplies route-specific title/subtitle and existing Light/Dark/System
  control in a native popover. Only `/deals` has search: TransactionsBrowser portals
  the existing controlled input into the header, retaining query/filter/history and
  clear behavior. No global search or new data lookup is introduced.
- Desktop content caps at 1200px with 28px padding; `.desktop-grid` offers a future
  12-column/minmax(0,1fr) grid. It is not applied to redesign current page bodies.
  The shell wrapper contributes no mobile box (`display: contents`); existing mobile
  spacing/navigation remain. Print hides shell controls and removes the sidebar offset.
- `layoutPrimitives.tsx` is a presentation-only extraction of existing PageHeader,
  Card, SectionTitle, Notice and EmptyState, so client consumers do not import the
  server cookie-based shell. Their markup/styles are unchanged. Existing body titles
  remain; consolidating page content/headers belongs to a later content pass.
- Text/tap/focus checks cover all roles and themes. All 17 AppShell routes were checked
  at 1440/1280/1024/390 (408 page views) with no horizontal overflow/runtime exceptions.
  Captures, functional checks and detailed mobile raster comparisons are documented
  in `ui/screens/creident-desktop-shell/README.md`, including dynamic-widget readiness
  and the tiny callback-border raster difference. Do not claim every raw pixel pair
  is identical when comparison evidence records a rendering exception.

### Mobile info-page spacing (2026-10-26)

- AppShell uses zero mobile padding only with explicit `mobileFullBleed`; active
  navigation no longer chooses geometry. Home and Settings explicitly opt in,
  retaining their own header/panel insets. Transactions and Records already opt in.
  Ordinary pages retain `px-5 pt-6`, including Reviewer oversight and its access notices.
- About (including #decisions / #limitations) and Fairness use InfoPageShell:
  compact MobileBrandHeader, existing role dropdown, overlapping MobilePanel with
  20px sides, original title/subtitle and Back to `/menu`. Desktop uses the original
  PageHeader and transparent panel wrapper, with unchanged page geometry.
- Below 1024px only, `.info-panel` cards, notices, rule rows and logo box use 24px
  radius and 16px content padding, matching the Records explainer card scale.
  Rule containers have no extra outer padding: summary and expanded body each use
  16px. Warning Notice colors retain their meaning; ordinary cards use `--bg`.
  These hooks do not change Card/Notice defaults on other pages or desktop.
- Info headings are 18px with shared spacing; body text remains at least 14px,
  rule chips 12px, and the source brand tagline retains its prescribed 12px scale.
  Fairness values are 28px on mobile; notices/metrics share the same grid inset.
  Long text/IDs wrap. No evaluation data, wording, metric formula or claim changes.
- Native details/summary remains keyboard accessible. All info summaries are at
  least 44px, with explicit visible focus; existing chevrons and R1–R7 labels stay.
  Anchor sections use 24px scroll margin; end-of-document anchors may stop lower
  when there is no further content to scroll, but remain visible above the dock.
- Evidence: `ui/screens/info-pages-mobile/`. Home/Settings at 360/390px remain
  pixel-identical. About/Fairness/oversight at 1440px remain pixel-identical;
  raw comparison data records tiny unrelated Settings desktop border raster noise.

### Deal detail story (2026-10-26)

- Detail heading is the stored item name; the deal ID is secondary. Main-column
  order: summary, one Your next step card, recorded Decision if present, Progress,
  Activity. The original duplicated Next banner is removed. Keep #next-step.
- Summary uses the actual item, amount, text StatusPill and existing deadline data.
  Demo payment · no real money remains visible for demo/simulated deals, including
  drafts in simulated mode. No balance, payout or invented financial values.
- Move the same acceptance/payment/shipping/inspection/evidence/review/return UI
  into the one next-step branch. Inspection retains its existing confirm/dispute
  alternatives. Waiting roles get the existing task-helper wording naming the
  acting party, no next-step button, and relevant switch-role guidance. All error,
  capture-failure and partial-refund pending notices remain.
- Decision card uses recorded human outcome/amount/reason and stored payment-success
  state (see follow-up below), plus the receipt's exact Yes / No, see reason /
  human escalation agreement logic. Reason is clamped to
  two lines; View decision receipt opens the complete record. Required-return and
  pending decisions stay explicitly pending. No new confidence/AI marker.
- Timeline data is unchanged. This page opts into a visible Current step label
  and aria-current; the shared styleguide keeps its prior appearance. Empty
  Activity keeps its heading/record link and says No activity yet.
- Secondary details come last on phones: Locked terms and Fees & payment details
  are native disclosures, initially closed, keyboard-focusable 44px summaries.
  Desktop shows a normal expanded read-only section in a 360px aside, selected
  by CSS from first paint; mobile uses native closed details. Short asides stick
  only while their height fits. PayPal case tools, courier claim and Deal record
  retain their existing components/routes here. Seller sharing belongs immediately
  under the next-step card in the main column (follow-up below).
- All deal-detail cards/notices/record panels use the info-page 24px radius / 16px
  inset scale at both widths, scoped by .deal-story and presentational data-ui
  hooks. Inner key/value lists in a disclosure are content, not nested cards.
  Other routes retain their existing styles. Body >=14px, chips >=12px; tokens,
  focus, wrapping and demo markers remain. No source lib/API/payment/rule/audit
  changes. Evidence and the complete status/role table: ui/screens/deal-detail-story/.


### Deal detail truthfulness and first paint (2026-10-26 follow-up)

- Outcome wording must reflect successful stored financial state, not just the
  reviewer's choice or an event's requested effect. RELEASE requires captured=true
  for Payment charged. Full refunds require REFUNDED (including frozenFrom);
  VOIDED says Payment cancelled. Partial success requires completed metadata or
  PARTIALLY_REFUNDED/frozenFrom. Otherwise retain neutral decision-recorded/pending
  or awaiting-return wording. Never imply payout. Exact state/wording table:
  ui/screens/deal-detail-story/followup/README.md.
- All Decision amounts use the deal currency. Remove the card's unrecorded fee
  assertion; policy copy in secondary fees is not a transaction fee receipt.
  The create API remains USD-only; renderer compatibility is not new currency support.
- Show Seller's Share with the buyer card immediately after #next-step whenever
  created=1 or DRAFT. Do not claim the Seller already accepted merely from a URL
  flag. Preserve the actual CopyLinkButton route and feedback.
- Call PayPalDisputePanel without a page-level guard. Its original internal rule
  still hides uncaptured/no-case deals; preserve all existing case/demo notices.
- DealDisclosure has no effect-driven layout: CSS selects ordinary expanded
  desktop sections or initially closed mobile details at 1024px. Both are rendered
  from the same read-only children, but only one is visible/accessibility-exposed.
  Do not place IDs or interactive controls inside this read-only component.
  Native mobile summary remains 44px/focusable, also without JavaScript. The
  24px/16px card scale and short-aside sticking behavior remain unchanged.

- Verification caveat: full-app React streaming still needs its bootstrap JS to
  reveal the page envelope. No-JS disclosure checks isolate the server HTML with
  real application CSS; they prove component first-paint behavior, not full-app
  no-JS support. AppShell streaming is outside this detail-page change.
