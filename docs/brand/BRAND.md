# Creident — approved raster brand kit v3

**Raster artwork cropped from the approved AI brand board; a vector version may replace it later.**

Source: owner-uploaded `docs/Creident Brand Kit.jpg` (1280×720 actual file), already
committed by the owner in 8d342de and merged in PR #89. BK2 adds no original JPG.
Do not use the rejected v2 vector redraws for app identity. Artwork spelling and
custom C/check/d shapes are preserved as pixels, not retyped or redrawn.

## Files and use (`public/brand/v3/`)

| File | Use |
|---|---|
| wordmark-light.png | Navy wordmark on light surfaces, BrandLogo |
| wordmark-dark.png | White wordmark on dark/Navy surfaces, mobile header and desktop sidebar |
| mark.png / mark-dark.png | Standalone crop; BrandLogo symbolOnly preserves the existing API |
| icon-navy.png | Approved Navy app tile, source for generated app icons |
| icon-white.png / icon-sapphire.png | Alternative approved app tiles, including original white border |
| favicon.ico / favicon-32.png | Multi-size 16/32 icon and PNG metadata |
| apple-touch-icon.png | 180px Apple icon; also src/app/apple-icon.png |
| icon-192.png / icon-512.png | App icon sizes registered in metadata |
| og-image.png | 1200×630 Navy share image with crop and Plus Jakarta Sans tagline |

Next's existing src/app/icon.svg convention now embeds the v3 PNG, not the old
symbol. Open Graph and Twitter metadata point to og-image.png. No manifest existed,
so none was added. Old public/brand/symbol-*.png remain untouched and unused.

## Crop and transparency

Run `/usr/bin/python3 docs/brand/crop-v3.py` from repo root using installed Pillow.
Crop rectangles are measured against the actual 1280×720 source. Background-matte
estimation recovers alpha and unmixes edge pixels rather than deleting only pure
white pixels. Dark wordmark uses a row-based Navy estimate; light/mark crops use
white. Low-level JPEG background noise is suppressed. App tiles retain their
original artwork with a high-resolution rounded-corner alpha mask outside them.
All six main crops are enlarged exactly 2× using Lanczos, with no sharpening.
The additional dark standalone crop keeps symbolOnly legible in dark themes.

The source contains JPEG compression and soft edges. 2× export does not create
new detail; large presentations/512px icons and the share card remain softer than
vectors. Tiny pale edge pixels may still reflect the original compressed artwork;
review crops against their intended backgrounds, not a checkerboard alone.

## Use

- Preserve aspect ratio, the complete C/check and curled d. Use next/image without
  additional recompression for these small source crops.
- Wordmark minimum displayed height: 18px; standalone mark: 16px. Prefer wordmark
  height 26–30px in headers/sidebar. Reserve one check-height of clear space.
- Use light crop on light surfaces; dark crop on Navy/dark surfaces. Do not recolor,
  redraw, stretch, sharpen, rotate, or add shadows to the artwork.
- Exact tagline: **Every deal, on record.** Body DM Sans, headings Plus Jakarta Sans;
  Outfit remains installed but is not used to retype the artwork.
- Theme tokens remain Navy #0B1F4B, Sapphire #3B82F6, Sky #93C5FD, Ice #DBEAFE.
  Source artwork's AI/JPEG hues remain as supplied, without palette recoloring.

## Evidence

Screenshots and browser checks: docs/ui/screens/brand-v3/. 360px/1280px Home in
both themes, sidebar, favicon asset and share image. Headless Chromium cannot
capture browser tab chrome; favicon link/asset loading is checked, but no fake
browser-tab screenshot is supplied. Test/typecheck/build results: HANDOFF.md.
