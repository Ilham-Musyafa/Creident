# Fairness spacing pass 2 and Settings QA

Final production captures: Fairness and Settings at 390/1228/1280/1440/1920/2560px × Seller/Buyer/Reviewer × light/dark (72 views). Baseline checks covered 60 views, with before screenshots saved for all mobile views and Seller light at 1228px.

- All 12 mobile before/after screenshot pairs match byte-for-byte.
- Fairness text is unchanged. All four desktop Settings sections retain identical content, IDs and bounding boxes; the Demo workspace card remains. The desktop section shortcut navigation and its unused constant are removed. Desktop /menu#transparency still resolves.
- Measured spacing: title/question 8px, header/first metric 32px, between metrics 40px with a 1px divider, metric parts 12px / bar-description 16px, difference box 24px, case rows 16px / subtitle gap 24px, blue bullets 14px, legend rows 16px.
- Metric cards remain equal height and first metrics aligned. Cases, orange note and bottom Technical details were also expanded.
- All page/card boundaries fit the viewport, including at 1228px. No internal-card overflow, horizontal scrollbar, right-edge cutoff or browser console errors/warnings. No overflow-hiding rule was added.
- Source scan finds no removed Settings shortcut heading or aria-label in src/.

Typecheck, 632 tests / 59 files and production build passed. No tests needed changing. Only desktop Fairness spacing, an inert card class and the Settings shortcut block/constant were changed. The older unmerged ui/settings-remove-onpage branch is superseded by this task.
