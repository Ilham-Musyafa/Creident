# NexoBank-style mobile Records

Captured from the production build with synthetic demo data on 2026-10-25.

- `list`, `detail`, `how`: 390px Buyer view, light/dark; both 844px viewport captures
  and expanded-height full-page captures are included. The role dropdown and layouts
  were also checked as Seller and Reviewer.
- `failed-list`, `failed-detail`: a separate temporary copy of the synthetic database.
  Two deliberately invalid fingerprints were appended to exercise failure at step 9
  and the later unchecked step. Application verification code, append-only triggers
  and the main demo database were left intact. This database is not committed.
- `desktop-list-light-1440.png`: unchanged desktop list, full page.
- `desktop-comparison.json`: pixel comparison against the pre-change production build
  at `5f191f4`. All three pages in light/dark are pixel-identical at 1440px; PNG
  digests are included. Animations/transitions were disabled in both comparisons.

Full-page capture heights are expanded to place the fixed navigation below content.
Reviewer CSV downloads were tested with a local test access code; existing access
checks were preserved. No real payments, personal data or secrets appear in captures.
