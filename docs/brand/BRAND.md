# Creident — Brand Guidelines

**Tagline:** *Every deal, on record.*

## 1. Meaning
The mark is a **C** for Creident with a **checkmark** in its opening. Together they stand for an agreed deal, on record: two parties settle terms, and Creident keeps a clear record of what was agreed. The check sits *inside* the C but never touches it, because the record is separate from the parties. Describe the brand only as a way to agree on and record deals. Do not describe it as trustless, tamper-proof, secure escrow, guaranteed, or production-ready.

## 2. Logo versions (`public/brand/v2/`)
All files are pure vector paths (no live text or embedded images) with tight viewBoxes.

| File | Use |
|---|---|
| `wordmark-light.svg` | **Primary.** Navy letters with a Sapphire check, for white or Ice backgrounds. |
| `wordmark-dark.svg` | White letters with a **white** check, for Navy or other dark backgrounds. |
| `wordmark-mono-navy.svg` | Single colour (Navy), for one-colour print, stamps, embossing and fax/PDF. |
| `wordmark-mono-white.svg` | Single colour (White), for photos, Sapphire, or any colour where the check colour would clash. |
| `mark.svg` | Standalone C + check (48×48), for light backgrounds, avatars and in-app small branding. |
| `mark-dark.svg` | Standalone mark with a white C and Sky check, for dark backgrounds. |
| `app-icon-navy.svg` | **Default app icon.** Navy tile, white C, Sky check, corner radius 22%. |
| `app-icon-white.svg` | White tile, Navy C, Sapphire check. Use it on dark home screens or marketing next to the Navy icon. |
| `app-icon-sapphire.svg` | Sapphire tile with an all-white mark, for promotional and seasonal use. |
| `favicon.svg` | Transparent Navy C with Sapphire check, tuned for 16–32px. |

**Dark wordmark:** white letters and white check, matching the approved board.
The Navy app tile retains a Sky check as requested; the Sapphire tile uses white.

**Optical tuning:** an independent diagonal terminal clip trims only the lower
C opening. The check is placed separately, not surrounded by a check-shaped mask
or a painted white outline. Its short-arm edge is about 16 font units from the
trim plane (12% of a 130-unit reference stroke). The same geometry is used for
wordmark, marks, icons and favicon.

### Raster exports (`public/brand/v2/`)
| File | Notes |
|---|---|
| `favicon-16.png`, `favicon-32.png` | Exported from `favicon.svg`. |
| `apple-touch-icon-180.png` | Navy rounded tile, matching the requested exported app-icon style. |
| `icon-192.png`, `icon-512.png` | Navy app icon with rounded corners, for the web app manifest (`"purpose": "any"`). |
| `maskable-512.png` | Full-bleed Navy. The mark sits inside the central 80% safe circle (`"purpose": "maskable"`). |
| `og-image-1200x630.png` | Navy background, white wordmark, and the tagline in DM Sans. |
| `wordmark-light@2x.png`, `wordmark-dark@2x.png` | Transparent PNGs, 1562px wide. |

Suggested HTML:
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
<meta property="og:image" content="/og-image-1200x630.png">
```

## 3. Clear space
The minimum clear space on every side is **x = the height of the checkmark**. That is about 0.38× the wordmark height, or about 0.34× the 48-unit mark box. No text, edges or other graphics may enter this zone.

## 4. Minimum sizes
- **Wordmark:** at least **18px tall** on screen, or 6mm in print. Below that, use the mark.
- **Mark:** at least **16px**. At 16–32px, use `favicon.svg` or the PNG favicons, which have the widened gap.

## 5. Colour
| Name | HEX | RGB | Role |
|---|---|---|---|
| Navy | `#0B1F4B` | 11, 31, 75 | Primary: wordmark, text, dark surfaces |
| Sapphire | `#3B82F6` | 59, 130, 246 | Accent: check on light backgrounds, primary buttons, links |
| Sky | `#93C5FD` | 147, 197, 253 | Check on dark backgrounds, highlights on Navy |
| Ice | `#DBEAFE` | 219, 234, 254 | Tinted surfaces, borders, chips |
| White | `#FFFFFF` | 255, 255, 255 | Backgrounds, reversed logo |

### WCAG 2.x contrast ratios (computed)
| Pair | Ratio | Text AA (4.5) | Large text / UI (3.0) |
|---|---|---|---|
| Navy / White | **16.01:1** | ✅ | ✅ |
| Navy / Ice | **13.12:1** | ✅ | ✅ |
| Navy / Sky | **8.88:1** | ✅ | ✅ |
| Navy / Sapphire | **4.35:1** | ❌ (just under) | ✅ |
| Sapphire / White | **3.68:1** | ❌ | ✅ |
| Sapphire / Ice | **3.01:1** | ❌ | ✅ (borderline) |
| Sapphire / Sky | 2.04:1 | ❌ | ❌ |
| Sky / White | 1.80:1 | ❌ | ❌ |
| Sky / Ice | 1.48:1 | ❌ | ❌ |
| Ice / White | 1.22:1 | ❌ | ❌ (decorative only) |

What this means in practice:
- Body text should be Navy on White or Ice.
- Sapphire on White is fine for large text (24px and up, or 18.66px bold), icons, and the check. For small link text, use Navy or a darker blue.
- White text on a Sapphire button passes AA only for large or bold text. Make button labels at least 18.66px bold, or use a Navy button.
- Never put Sky text on White or Ice.

## 6. Typography
| Role | Typeface | Weights |
|---|---|---|
| Brand / logo | **Outfit** | The logo is outlined Outfit **700** with custom C, check and d glyphs. Never retype the logo; always use the SVG files. |
| Headings | **Plus Jakarta Sans** | 600–800 |
| Body / UI | **DM Sans** | 400 for body, 500–600 for UI labels |

**Tagline:** set *Every deal, on record.* in DM Sans 400, in sentence case and ending with a full stop. Use Ice or White on Navy, or Navy on light backgrounds.

## 7. Do / Don't
**Do**
- Use the supplied SVGs at their original proportions.
- Use `wordmark-light` on light backgrounds and `wordmark-dark` on Navy.
- Respect the clear space and the minimum sizes.
- Use the mono versions when only one colour is available.

**Don't**
- Retype "Creident" in Outfit or any other font.
- Stretch, skew, rotate, outline or add shadows or gradients to the logo.
- Recolour the check outside the palette, or let it touch the C.
- Move, resize or swap the check, or substitute a colored check for the white dark wordmark.
- Place the logo on busy photos without a solid panel.
- Pair the brand with claims such as "trustless", "tamper-proof", "secure escrow" or "production-ready".

## 8. Construction notes (BK1c)

- Outfit 700, outlined from the existing WOFF2 with preinstalled system FontTools
  and Brotli. No dependencies, package changes, font requests or kit glyph reuse.
- All letters except C and d keep the original Outfit outlines, with slightly looser +0.005em
  inter-letter adjustment. C terminal trimmed, rounded 95-unit compact check and
  approximately 16-unit thin separation. The check vertex is close to the baseline.
- Custom d: lower stem cut back, rounded tail bends right at y=60 with a 120-unit stroke, so its lower
  edge stays exactly at baseline y=0; it never drops below the other letters.
- Rebuild vectors: `/usr/bin/python3 docs/brand/build-v2.py`. Existing source font
  license remains in src/fonts/Outfit-OFL.txt. SVGs have outlined paths, no live text
  or embedded raster images. PNGs are rasterized from these new vectors.
- Five-card board: docs/brand/index.html; OG source: docs/brand/og-v2.html.
  Maskable source keeps the mark inside the central safe circle. No app wiring.

## 9. Match review and limits

The inline approved board guided the layout and shapes. Its original JPG was not
available as a local attachment. The supplied ZIP contains preview-vs-reference.png,
whose upper panel is the approved reference wordmark; that panel is used in
match-check.png, along with the rebuilt board and enlarged details. The rejected
kit's lower-panel glyphs were not reused. Attached JPG/ZIP files are not committed.

The result is not claimed pixel-identical: the original reference's r shoulder and
t foot differ from plain Outfit, while this request requires other letters to remain
plain Outfit. Exact raster softness, apparent blue hues and font-sample artwork also
differ; specified hex values and local fonts take precedence. C/check is rounder
than the reference's compact angled ends. d tail is now visible but its join still
needs owner visual approval. These differences are shown openly in match-check.png.

Managed Chromium blocks file://; screenshots use a temporary localhost static
server. HTML uses local relative files with no CDN/build. Test/typecheck/build
results and publication status are in docs/HANDOFF.md.

## 10. BK1d corrections

The requested Outfit weight is 700; BK1c was already generated at 700, so no false
weight reduction is claimed. Slightly looser tracking (+5 vs -10 font units) opens
the word. The d tail is now horizontal and baseline-bound, not a diagonal handle.
White app tile has a 0.7/48 light-grey #E5E7EB border. This border is a tile outline,
not an additional logo color. File list and core palette remain unchanged.
