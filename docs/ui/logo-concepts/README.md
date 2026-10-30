# L1 — Ten Creident symbol concepts

Open [index.html](index.html) directly; no server, scripts or external requests.
Outfit 600 loads from the existing repository font via a relative @font-face URL.
Keep the repository folder structure when viewing offline.

Each concept has a 48×48 viewBox and a dedicated dark variant, replacing Navy
with Ice. Sapphire is the second color; optional white supplies negative space.
All shapes are flat vectors with no raster artwork or lettering inside the symbol.
The gallery previews every symbol at 96, 48 and 24px, plus its wordmark lockup.

| # | SVG files | Idea | Strengths | Weaknesses at 24px |
|---|---|---|---|---|
| 01 | [Loop seal](01-loop-seal.svg) / [dark](01-loop-seal-dark.svg) | A squared loop folds inward to suggest a C pressed into a seal. | Compact silhouette; no small dots. | The inward fold may merge at very small sizes. |
| 02 | [Confirmed C](02-confirmed-c.svg) / [dark](02-confirmed-c-dark.svg) | An open C meets a separate check for an agreed deal. | Clear confirmation cue. | Check can dominate the letter. |
| 03 | [Common ground](03-common-ground.svg) / [dark](03-common-ground-dark.svg) | Two offset rounded squares share a solid meeting space. | Distinct two-party construction. | Overlap needs both tones to stay clear. |
| 04 | [Linked records](04-linked-records.svg) / [dark](04-linked-records-dark.svg) | Two stepped open blocks join along one shared record line. | Horizontal rhythm suggests a trail. | Small gaps require careful rasterization. |
| 05 | [Quiet shield](05-quiet-shield.svg) / [dark](05-quiet-shield-dark.svg) | A broad outline contains a small C without a padlock motif. | Contained, calm and legible. | May still imply a security product. |
| 06 | [Ledger stack](06-ledger-stack.svg) / [dark](06-ledger-stack-dark.svg) | Offset pages and two lines make the recorded agreement tangible. | Closest to Records and physical documents. | Inner lines can blur below 24px. |
| 07 | [Balanced line](07-balanced-line.svg) / [dark](07-balanced-line-dark.svg) | Three simple strokes hold equal sides around a central decision point. | Balanced without tiny scale pans. | Abstract; may need the wordmark for context. |
| 08 | [Meeting hooks](08-meeting-hooks.svg) / [dark](08-meeting-hooks-dark.svg) | Opposing hooks interlock to suggest a handshake without fingers. | Strong two-party gesture. | Can read as a link rather than a handshake. |
| 09 | [Notched stamp](09-notched-stamp.svg) / [dark](09-notched-stamp-dark.svg) | A solid stamped disk has a cut-out index notch and an impression line. | Bold silhouette survives favicon size. | Stamp meaning is subtle without context. |
| 10 | [Aligned corners](10-aligned-corners.svg) / [dark](10-aligned-corners-dark.svg) | Two opposing corners frame one shared square: agreement becomes a record. | Original compact geometry; no financial-service metaphor. | Abstract framing may feel less personal. |

## Recommendations

1. **10 Aligned corners** — compact geometric identity tied to agreement and records.
2. **06 Ledger stack** — most immediately explains the product's record emphasis.
3. **03 Common ground** — friendly two-party metaphor with a clear shared space.

Shield and check symbols are exploratory metaphors, not promises about outcomes.
No concept was selected or installed. Final selection still needs owner review;
small-size weaknesses above should guide subsequent refinement.

## Earlier work reviewed

Starting HEAD edb862b, branch ui/creident-mockup. Reviewed public/brand assets,
BrandLogo and the earlier exploration commit 055d7f6 (three options: dotted C trail,
two curved party strokes, C with diamond). Those historical files are not in this
checkout; git show was used. The current two-node circular Sapphire Flow mark was
also reviewed. New concepts avoid repeating that node/arc construction. The requested
C and two-party themes remain, but use new silhouettes and compositions.

## Verification

See preview-1.png for the complete 1440px gallery. Managed Chromium blocks file:// navigation by administrator policy. Screenshots
were therefore checked through a temporary localhost static server, with no build
step. Direct-file structure uses relative assets only; direct-file rendering could
not be verified in this managed browser. All 80 image previews and the local font must load; no external network
requests are required. App sanity checks and publication status are in HANDOFF.md.
