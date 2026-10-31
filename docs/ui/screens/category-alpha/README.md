# Alphabetical category picker QA

Seller at 390px and 1280px, light and dark, in simulated payment / replay AI mode.

- `category-open-*` and `subcategory-open-*`: genuinely open native selects. Existing headed Playwright/Chromium ran on the installed Xorg dummy display; ImageMagick captured the page region including the native popup. No replacement select, altered CSS or new dependency was used.
- `form-*`: normal form captures after verifying the Physical items only hint and subcategory reset.
- `created-deal-390.png`: UI creation completed, including automatic seller acceptance.
- `saved-*`: the created category on Home, Transactions and the deal page at 390/1280px.

All four views checked the full 18-category order and all 17 nonempty subcategory lists, with placeholders first and Other last. Also checked checklist attachment and the unchanged decimal keyboard attribute. A created Video Games & Consoles / Consoles deal retained the exact stable ids and checklist in SQLite terms JSON. No overflow or browser console errors/warnings occurred.

Typecheck, 636 tests / 60 files and production build passed. Four new helper tests cover ordering, case/accents, Other placement, empty lists, ids/object identity and source immutability. DEAL_CATEGORIES, labels/hints/templates, APIs, stored values, styling and deliberate filter orders are unchanged. NewDealForm is the only category picker found by the usage scan. Test data is isolated under /tmp; production data/configuration was not changed.
