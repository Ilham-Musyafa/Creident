# Desktop Fairness spacing QA

Before/after production Playwright captures: 390/1280/1920/2560px × Seller/Buyer/Reviewer × light/dark (24 views per stage).

- All six mobile before/after image pairs match byte-for-byte.
- Page text is unchanged in every view.
- Desktop major block gaps: 32px; card padding and inter-metric gaps: 28px; grid gaps: 24px; metric-part gaps: 8px; note lines/bullets: 16px.
- Three metric cards retain equal heights. Content stays naturally top-aligned without stretching Safety's single metric.
- Blue note text is limited to 75ch; shell width and outer margins remain unchanged.
- Cases, What this means and bottom Technical details were also expanded: no horizontal overflow or browser console errors/warnings.

Typecheck, 625 tests / 57 files and production build passed. No tests needed changing. The application change is limited to Fairness styling hooks and page-scoped desktop CSS. No text, numbers, labels, colours, icons or logic changed.
