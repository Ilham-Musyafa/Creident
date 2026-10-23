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
  body 14/400–600, caption 12/400, micro 11/700 (pills).
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
| `BottomNav` | Mobile: Home, Deals, (+) Sapphire Blue FAB, Audit, Menu, with text labels. Desktop (≥1024px): Menu button opens a modal sidebar sliding right from the left edge (owner-approved 2026-10-23), with the same items; close button, outside click and Escape dismiss it. Focus is contained and restored; reduced motion disables entry animation. Content max-width 1100px. |
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
stay available behind "Details", on the record (audit) pages and in receipts, never as the
main label. One word per idea across the app. Plain must still be honest: PayPal approves
(authorizes) a payment; it does not "hold your money" (AGENTS.md claim rules).

| Technical | Shown to users |
|---|---|
| Authorized / funds reserved | Payment approved · not charged yet |
| Capture / captured | Payment charged |
| Void / voided | Cancelled · not charged |
| Refund / partial refund | Refund issued / Partial refund issued |
| Inspection | Checking the item |
| Dispute opened | Problem reported |
| Under review / escalate to a human / R5 | Being reviewed / Needs a reviewer (rule ID only in details) |
| Frozen by PayPal | On hold · PayPal dispute |
| Simulated | Demo (no real money) |
| Audit log / hash chain | Deal record / record intact |
| Hash, head hash, digest | Fingerprint |
| prev hash | Linked to |
| Checkpoint | Sealed copy |
| Event | Step |
| Replay mode | Recorded test run |


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

- A dismissible “Try the demo” guide links to terms/deal, dispute, human review and
  audit examples. Demo roles are explicit; dismissal is an optional localStorage preference.
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
