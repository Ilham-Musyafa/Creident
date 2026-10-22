# UI.md — Creident visual guide

Status: **approved direction, 2026-10-21** (owner chose Midnight Ink + Mint, with light
and dark mode). Mockups: `docs/ui/halcyvault-ui-light.png`, `docs/ui/halcyvault-ui-dark.png`.
The mockups are concept images with sample data; this file is the source of truth.

Goal: **clean, modern, simple, fast, and still attractive.**

## 1. Principles

1. One main action per screen, in Mint. Everything else is neutral.
2. Money and status first: the amount and the current status are readable at a glance.
3. Status always has a **text label** (and ideally an icon). Never colour alone.
4. Explain, do not hide: show what happens to the money next and what the AI did and did not do.
5. Fast: no UI component library, no heavy animation, inline SVG icons, one web font.

## 2. Design tokens

All colours are CSS variables. **Never hard-code a hex value in a component.**
To change the brand later, edit the token values only (one place: `src/app/globals.css`).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#F7F7F4` | `#0B1020` | Page background |
| `--surface` | `#FFFFFF` | `#121A33` | Cards, inputs, nav |
| `--surface-2` | `#F1F5F9` | `#1A2444` | Chips, segmented control, subtle fills |
| `--line` | `#E5E7EB` | `#26325A` | Borders, dividers |
| `--text` | `#0F172A` | `#E5E7EB` | Body text |
| `--muted` | `#64748B` | `#94A3B8` | Secondary text |
| `--heading` | `#172554` | `#E0E7FF` | Headings, back links, active nav |
| `--hero` | `#172554` | `#1B2A63` | Amount card background |
| `--hero-text` | `#FFFFFF` | `#FFFFFF` | Text on the amount card |
| `--hero-sub` | `#C7D2FE` | `#A5B4FC` | Secondary text on the amount card |
| `--accent` | `#5EEAD4` | `#5EEAD4` | Main action only (Mint) |
| `--on-accent` | `#172554` | `#0B1020` | Text/icon on Mint (contrast 9.9 in light) |
| `--strong` | `#172554` | `#E0E7FF` | Strong secondary action (e.g. Refund) |
| `--on-strong` | `#FFFFFF` | `#0B1020` | Text on `--strong` |

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
| DRAFT | Draft | void |
| TERMS_LOCKED | Terms locked | completed |
| AWAITING_APPROVAL | Awaiting approval | awaiting |
| AUTHORIZED | Authorized (funds reserved) | authorized |
| SHIPPED | Shipped | inspection |
| IN_INSPECTION | Inspection | inspection |
| DISPUTED | Disputed | disputed |
| UNDER_REVIEW | Under review | disputed |
| FROZEN_EXTERNAL | Frozen by PayPal | frozen |
| COMPLETED | Completed | completed |
| REFUNDED | Refunded | void |
| PARTIALLY_REFUNDED | Partially refunded | void |
| VOIDED | Voided | void |
| CANCELLED | Cancelled | void |

## 3. Light, dark and system mode

- Three options in Menu > Appearance: **Light, Dark, System** (default System).
- Implement with a `data-theme` attribute on `<html>` and the token sets above
  (`:root` = light, `[data-theme="dark"]` = dark, `prefers-color-scheme` for System).
- Store the choice in `localStorage` (per-viewer convenience only; wrap in try/catch).
- Set the attribute with a tiny inline script in `<head>` before paint to avoid a flash.
- Mint stays the same in both modes; only `--on-accent` changes.

## 4. Typography

- **Plus Jakarta Sans** (SIL Open Font License), loaded with `next/font` (self-hosted at
  build, no layout shift). Weights 400, 500, 600, 700, 800 only.
- Monospace (hashes, codes): system `ui-monospace`.
- Scale: amount 32/800 (tight letter-spacing), screen title 16/700, section 15/700,
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
| `AmountCard` | Navy card, label "Authorized via PayPal, not yet captured" style wording, big amount, 3 stat tiles, one Mint action. |
| `DealListItem` | Icon tile tinted with the status token, title, status pill, amount right-aligned. |
| `Timeline` | Steps: done (filled heading colour + Mint check), current (inspection token), upcoming (outline). |
| `KeyValue` | Label/value rows with dashed dividers (fees, ids). |
| `FindingCard` | Criterion, "Supports buyer / Supports seller / Unclear" pill, evidence chips (E1, E3...). |
| `RuleNotice` | Warning notice naming the rule (R1–R7) and stating the AI cannot move money. |
| `AuditEvent` | Sequence number, event title, mono line with actor, time, previous hash. |
| `ChainStatus` | Success notice "Chain verified · N events" + head hash; error state when broken. |
| `Field` / `Input` | Label above, 44px input, placeholder in muted. |
| `SegmentedControl` | Used for role switch (demo) and appearance. |
| `BottomNav` | Mobile: Home, Deals, (+) Mint FAB, Audit, Menu, with text labels. Desktop (≥1024px): left sidebar with the same items, content max-width 1100px. |
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

- Text contrast 4.5:1 or more (Mint with navy text passes; never white text on Mint).
- Every status, error and success has text, not only colour.
- Keyboard focus visible; buttons are `<button>`, links are `<a>`.
- Respect `prefers-reduced-motion`; transitions under 200ms.
- No layout shift from fonts; images sized and lazy-loaded.
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
| Capture / captured | Payment completed (charged) |
| Void / voided | Payment cancelled · nothing charged |
| Refund / partial refund | Refunded / Partly refunded |
| Inspection | Checking the item |
| Dispute opened | Problem reported |
| Under review / escalate to a human / R5 | Being reviewed · a person decides (rule ID only in details) |
| Frozen by PayPal | On hold by PayPal |
| Simulated | Demo (no real money) |
| Audit log / hash chain | Deal record / record intact |
| Hash, head hash, digest | Fingerprint |
| prev hash | Linked to |
| Checkpoint | Sealed copy |
| Event | Step |
| Replay mode | Recorded test run |

