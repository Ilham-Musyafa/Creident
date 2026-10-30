# L3 — Check-C wordmark study

[Gallery](index.html) · [Full 1440px preview](preview-1.png)

48 SVGs: twelve light wordmarks, twelve dark wordmarks and twelve standalone marks
with matching dark variants. Standalone viewBoxes are 48×48. Preview includes app
icon tiles on Ice/Navy (rx 12), marks at 96/48/24px, wordmarks at canvas heights
48/28/18px and all twelve at sidebar size. Canvas includes optical breathing room;
actual glyph ink is shorter than the canvas height.

## Construction

Outfit variable font instantiated at 500/600/700 using preinstalled system Python
FontTools, then glyph outlines exported to SVG paths. No dependency was added.
No SVG text or font loading is needed. C terminals are clipped and joined to custom
rounded check paths; variation 06 deliberately retains the original lower terminal.
The source font's SIL OFL remains in src/fonts/Outfit-OFL.txt; these outlines are
artwork derived from it, not a redistributed modified font. No real logo was traced.

The requested check-c.png reference was absent. These are interpretations of the
written direction, not a claimed match to an unseen image. Variation 07 is lowercase
as explicitly requested; all letters remain c-r-e-i-d-e-n-t, with no altered spelling.

| Variation | What changed | Small-size readability | Recommendation |
|---|---|---|---|
| 01 [Baseline](01-baseline.svg) | Terminal becomes a compact check. | Strong starting point. | Top 3 |
| 02 [Heavier](02-heavier.svg) | Weight 700, same check geometry. | Confident, but counters tighten. | Compare |
| 03 [Lighter](03-lighter.svg) | Weight 500, longer and thinner check. | Airy; finest detail at small size. | Compare |
| 04 [Rounded check](04-rounded-check.svg) | Extra soft check, larger rounded join. | Friendly, with a slightly larger accent. | Top 3 |
| 05 [Detached check](05-detached-check.svg) | Small gap separates the check from the C. | Clear check; less integrated. | Compare |
| 06 [Overlap check](06-overlap-check.svg) | Intact C terminal with a Sapphire check on top. | Layering is denser at 18px. | Compare |
| 07 [Lowercase](07-lowercase.svg) | Lowercase c with a proportionally smaller check. | Friendly; less emphasis on the initial. | Compare |
| 08 [Two-tone](08-two-tone.svg) | Cre in Navy, ident in Sapphire; Navy check. | Color split can compete with the initial. | Compare |
| 09 [Tight tracking](09-tight.svg) | Tracking -0.03em, unchanged weight. | Compact; neighboring letters get closer. | Compare |
| 10 [Wide tracking](10-wide.svg) | Tracking +0.02em, unchanged weight. | Open rhythm; needs more horizontal space. | Compare |
| 11 [Echo dot](11-echo-dot.svg) | Tiny rounded check replaces the i dot. | Distinct echo; smallest check is intentionally subtle. | Compare |
| 12 [Gentle rise](12-gentle-rise.svg) | Short rising check and mildly tightened spacing. | Balanced accent; recommended refinement. | Top 3 |

## Top three

1. **12 Gentle rise** — the short ascending check sits naturally at the lower C
   terminal; modest tightening keeps the complete word balanced.
2. **01 Baseline** — simplest control version, useful for judging every refinement.
3. **04 Rounded check** — softest character; a strong candidate if friendliness
   matters more than compactness. The check is intentionally a little larger.

At 18px the check remains a color/shape cue, while inner details are necessarily
small. The echoed i check in 11 is deliberately subtle and weaker than the main C.
This is a direction study, not a selected final identity or an installed app asset.

## Verification

Managed Chromium blocks file:// navigation. Relative SVG assets require no server
or build in the design, but direct-file rendering could not be verified here.
Screenshot uses a temporary localhost static server, with no external requests.
App sanity gates and publication notes are recorded in docs/HANDOFF.md.
