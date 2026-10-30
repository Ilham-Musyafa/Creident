# Creident — Check-C brand kit v2

Status: owner-selected direction rebuilt as vector artwork; not yet wired into the
application. Existing brand files remain unchanged. This guide governs the new
`public/brand/v2/` kit; the older PDF documents the previous identity.

## Meaning and construction

Creident records the terms, steps and decisions of a buyer–seller deal. The C's
lower terminal becomes an separated check: agreement goes on record. A soft inward
hook at the bottom of the d stem meets its bowl, leaving a small rounded notch at
the lower right. Other letters are standard Outfit. Spelling: **Creident**.

Outfit **700** best matches the attached bold geometric reference. Glyphs are
outlined from the repository's existing variable WOFF2 using preinstalled system
Python FontTools/Brotli. Custom C and d details are clean vector geometry, not
pixel tracing. Rebuild SVGs from repository root:

```sh
/usr/bin/python3 docs/brand/build-v2.py
```

No package.json change, installation or remote font request. Font license:
`src/fonts/Outfit-OFL.txt`. PNGs were rasterized from these SVGs using Chromium
canvas at their named sizes; the OG image uses `docs/brand/og-v2.html`, local DM
Sans and the outlined dark wordmark. No attached reference image is committed.

## Versions

| Asset | Use |
|---|---|
| wordmark-light.svg | Navy letters, Sapphire check on white/light backgrounds |
| wordmark-dark.svg | White letters, Sky check on Navy |
| wordmark-mono-navy.svg | Single Navy ink on light backgrounds |
| wordmark-mono-white.svg | Single white ink on dark backgrounds |
| mark.svg / mark-dark.svg | C-check alone, optically positioned in a 48×48 canvas |
| app-icon-navy/white/sapphire.svg | Centered mark on rounded square, radius 22% |
| favicon.svg / favicon-16.png / favicon-32.png | Light-background favicon exports, not wired yet |
| apple-touch-icon-180.png | Apple-touch export |
| icon-192.png / icon-512.png | Standard application icons |
| maskable-512.png | Full-bleed Navy square, no transparent corners |
| og-image-1200x630.png | Navy social card, white wordmark and exact tagline |

Dark check uses Sky for stronger contrast against Navy (8.88:1 vs Sapphire 4.35:1).
The Sapphire app icon uses a white monochrome mark to avoid blue-on-blue contrast.
Maskable artwork stays inside the central 70% square: its farthest mark points fit
inside the standard center circle of radius 40%, protecting it under common masks.
`maskable-source.svg` is the reproducible full-bleed source.

## Spacing and size

Clear space on every side equals **one check height** (approximately 20 units in
the 48-unit wordmark canvas). Scale that allowance with the artwork. Never place
another icon, text or boundary inside it. The board's dashed box illustrates this.
Minimum wordmark canvas height: **18px**. Minimum mark canvas: **16px**. At 16px,
the check is a compact shape, not fine detail; prefer the 32px export when possible.
Do not crop away the optical padding or the attached check.

## Color and accessibility

Ratios below are sRGB WCAG contrast calculations, rounded to two decimals.
Normal text needs 4.5:1 for AA; large text needs 3:1. Logo artwork itself is exempt
from the text contrast requirement; this does not exempt surrounding UI labels.

| Color | Hex | On White | On Navy | Text guidance |
|---|---|---:|---:|---|
| Navy | #0B1F4B | 16.01 | 1.00 | Primary text on light surfaces |
| Sapphire | #3B82F6 | 3.68 | 4.35 | Large text/accent; not normal AA text on white or Navy |
| Sky | #93C5FD | 1.80 | 8.88 | Text/accent on Navy; not text on white |
| Ice | #DBEAFE | 1.22 | 13.12 | Light surface; text on Navy |
| White | #FFFFFF | 1.00 | 16.01 | Text on Navy; white on Sapphire is 3.68, large text only |

## Typography and tagline

- Brand: Outfit 700, outlined custom wordmark; do not retype the custom C or d.
- Headings: Plus Jakarta Sans.
- Body and tagline: DM Sans.
- Exact tagline: **Every deal, on record.** Include the comma and full stop.
- Fonts are already self-hosted in src/fonts; the board loads only those files.

## Do / don't

Do use the background-appropriate version, preserve proportions and clear space,
and use monochrome exports when one ink is required. Use supplied favicon/icon
exports instead of shrinking the entire wordmark into an app tile.

Do not stretch, rotate, recolor the check outside the supplied variants, add shadows
or gradients, place on busy photographs, change the specified C/check spacing, edit the d
hook, change spelling, or imply guaranteed outcomes. Do not replace app wiring in
this asset-preparation step.

## Review and verification

[Brand board](index.html) displays every requested asset on white and Navy, including
opposite-background samples to make incorrect usage obvious. [Screenshot](brand-board.png)
is 1440px wide. Managed Chromium blocks file:// navigation; a temporary local static
server was used for preview/export. The board has only relative local references,
no scripts or CDN; direct-file behavior cannot be verified in this managed browser.
All 37 images load without overflow. Sanity gate results are recorded in HANDOFF.md.


## BK1b spacing refinement

Option B uses a 52-unit separation (40% of the 130-unit reference letter stroke).
Check stroke is 108 units (83%), round caps/joins. A geometric exclusion mask
keeps letter and check separate even in monochrome exports. C lower terminal is
trimmed around five o'clock; the check is repositioned inside the opening.
The d stem bends inward to meet its bowl; the lower-right contour is hooked.
Other glyph outlines are unchanged.

At 16px, the mathematical 40% gap could close visually through antialiasing.
Standalone marks therefore use an 85-unit optical exclusion floor, propagated to
app icons/favicons. This is a small-size exception, not a different wordmark option.
See fix/compare.html (A 30%, B 40%, C 50%) and fix/before-after.png. The check stays
part of the fixed composition, but must never touch the C. Use the supplied exports.
