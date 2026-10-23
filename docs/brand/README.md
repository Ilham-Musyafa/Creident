# Creident — Sapphire Flow

Owner-provided identity, approved for application to the project on 2026-10-23.
Source: [Creident Brand Guidelines](Creident_Brand_Guidelines.pdf), nine pages.
The previous mint/diamond identity is superseded. The owner approved Plus Jakarta Sans
headings and DM Sans interface typography on 2026-10-23; the signature is unchanged.

## Identity

- Exact line: **Every deal, on record.**
- Midnight Navy `#0B1F4B`, Sapphire Blue `#3B82F6`, Sky Blue `#93C5FD`, Ice Blue `#DBEAFE`.
- Georgia Regular for the signature and Arial for its tagline. Application typography
  uses locally hosted Plus Jakarta Sans and DM Sans, with OFL notices in `src/fonts/`.
  No commercial fonts are redistributed.
- The logo's two terminal nodes and separate arcs must remain intact. Do not rotate,
  stretch, recolour, add shadows/outlines or pair it with shields/locks/company logos.

## Assets and provenance

The source PDF embeds 960×960 RGB images and a transparency mask. The original
navy-arc (PDF image object 7) and white-arc (object 3) symbols were extracted with
their original mask (object 4), then resized without redrawing or changing colours.
The PDF remains the source for future regeneration; no editable vector master or
rights clearance is asserted. Its handoff notes identify raster-derived artwork
and reconstructed wordmark typography.

| Asset | Purpose |
| --- | --- |
| `/brand/symbol-light.png` | 192px transparent navy-arc symbol for light UI |
| `/brand/symbol-dark.png` | 192px transparent white-arc symbol for dark UI |
| `/brand/app-icon-light.png`, `/brand/app-icon-dark.png` | 512px app tiles, white/navy background |
| `/brand/favicon-{16,32,48}-{light,dark}.png` | Small PNG exports for browser/device use |
| `/brand/favicon.ico` | Multi-size 16/32/48px light ICO |
| `src/app/icon.svg` | Adaptive light/dark browser icon embedding the source-derived PNGs |
| `src/app/apple-icon.png` | 192px white app tile, exposed by Next.js metadata |

`BrandLogo` composes source pixels with live Georgia text. The 200px minimum lockup,
48px symbol and 12px padding/gap retain at least a node diameter of clear space.
On mobile Home and About, the signature is visible; desktop uses a 256px sidebar
to fit the full signature. The favicon SVG is a raster container, not a claimed
vector reconstruction. Existing artwork may show raster artefacts when enlarged.

## UI adaptations

All application colours stay in `src/app/globals.css`. Light/dark backgrounds and
muted text are supporting derivatives; semantic status/notice colours retain their
meanings. Sapphire Blue with white or exact brand navy text falls below 4.5:1, so
normal button/chart-label text uses darker navy `#07142F`. This does not recolour
the logo. The AG Studio theme reads the same CSS tokens and application body font stack.

Business rules, payments, role gates and record formats are unchanged. Prototype,
simulation and AI limitations stay visible. Historic screenshot galleries remain
examples of earlier UI; current brand screenshots are linked in the change PR.

## Checked screenshots

Local simulated payments and AI replay, synthetic demo data only. Viewports are
390×844 (mobile) and 1440×900 (desktop); these are viewport captures, not full pages.

| Screen | Mobile light | Mobile dark | Desktop light | Desktop dark |
| --- | --- | --- | --- | --- |
| Home | [PNG](../ui/screens/brand/home-390-light.png) | [PNG](../ui/screens/brand/home-390-dark.png) | [PNG](../ui/screens/brand/home-1440-light.png) | [PNG](../ui/screens/brand/home-1440-dark.png) |
| New deal | [PNG](../ui/screens/brand/new-390-light.png) | [PNG](../ui/screens/brand/new-390-dark.png) | [PNG](../ui/screens/brand/new-1440-light.png) | [PNG](../ui/screens/brand/new-1440-dark.png) |
| About | [PNG](../ui/screens/brand/about-390-light.png) | [PNG](../ui/screens/brand/about-390-dark.png) | [PNG](../ui/screens/brand/about-1440-light.png) | [PNG](../ui/screens/brand/about-1440-dark.png) |
| Review | [PNG](../ui/screens/brand/review-390-light.png) | [PNG](../ui/screens/brand/review-390-dark.png) | [PNG](../ui/screens/brand/review-1440-light.png) | [PNG](../ui/screens/brand/review-1440-dark.png) |
| Receipt | [PNG](../ui/screens/brand/receipt-390-light.png) | [PNG](../ui/screens/brand/receipt-390-dark.png) | [PNG](../ui/screens/brand/receipt-1440-light.png) | [PNG](../ui/screens/brand/receipt-1440-dark.png) |
| Oversight | [PNG](../ui/screens/brand/oversight-390-light.png) | [PNG](../ui/screens/brand/oversight-390-dark.png) | [PNG](../ui/screens/brand/oversight-1440-light.png) | [PNG](../ui/screens/brand/oversight-1440-dark.png) |
