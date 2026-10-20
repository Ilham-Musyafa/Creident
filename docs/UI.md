# UI.md — HalcyVault visual guide

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

1. Home (role-aware: seller/buyer/reviewer)
2. Deal detail with timeline, fees, actions
3. Dispute review (AI findings, rule notice, reviewer decision with required reason)
4. Audit log with chain verification
5. New deal (seller): terms, in-app photos, ship-by and inspection windows, fee estimate
6. Buyer checkout: terms locked + hash, "How it works" in 3 steps, Sandbox notice,
   "Continue to PayPal (Sandbox)"
7. Add evidence: one-time code, in-app photo only, submitted items with content hash
8. Menu: demo role switch, appearance (Light/Dark/System), "How decisions are made",
   "Audit & verification", "Limitations", "About"

Time values shown (3 days ship-by, 2 days inspection) are placeholders until the owner
decides them. "Fee on refund borne by" stays "TBD" until decided.

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
