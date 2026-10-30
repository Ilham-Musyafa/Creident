# C30 — New-deal categories and subcategories

Baseline origin/main 0eeb2f1, after C28 merged in PR #93. Branch ui/new-deal-categories.

## Changes and reasons

| File/area | Change | Reason |
|---|---|---|
| src/lib/dealCategories.ts | 18 ordered categories, explicit stable category/subcategory slugs, plain labels, physical-games hint | One taxonomy source; label edits need not change persisted IDs |
| NewDealForm.tsx | Item name, unchanged decimal price validation, required native Category, dependent optional Subcategory | Extend existing form/terms, no new endpoint or column |
| Same form + categoryChecklist | Remove old Item type select; attach Phone/Laptop/Camera/Audio/Console checklists to five subcategories | Reuse mergeCriteria, preserve custom lines and editable checks |
| categoryTerms | Serialize valid chosen IDs into terms.category / terms.subcategory | Existing JSON storage and normal terms lock/hash path |
| resolveDealCategory | Read phone/laptop/camera/audio/console and missing/unknown values | Backward-compatible display without rewriting locked terms |
| CategoryChip, transactionsView, row/Home renderers, deal page | Category chip on rows; category/subcategory beside deal heading | Show classification where users scan deals |
| demoSeed.ts | Sensible category/subcategory on all 13 fresh demo examples | Current demo data exercises the taxonomy |
| ai/copilot-replay.json | Append exact new seeded Smartwatch snapshot with category metadata; keep old entry/output | Strict snapshot matching otherwise makes the existing seeded AI draft unavailable |
| Tests | Taxonomy, legacy mapping, checklist attachment/merge, native form contract, submission terms; stronger seeded-category checks | Catch missing/duplicate IDs, broken mappings, lost custom checks and malformed terms |

No state-machine, R1–R7, schema, repository, production API, payment, deadlines,
audit algorithm or dependencies changed. Checklist data and mergeCriteria unchanged.
The replay fixture addition is synthetic recorded data only; no AI runtime guard,
matching rule, response algorithm or human outcome was altered. Original fixture
continues to support old seeded terms, including existing backfill tests.

## Taxonomy and legacy values

All IDs are literal slugs. Subcategory IDs include their category prefix, including
Other, so they are globally unique. Seventeen subcategory lists end with Other;
top-level Other has none. Categories/labels follow the owner's requested order.

| Old category | Display |
|---|---|
| phone | Mobile Phones / Smartphones |
| laptop | Electronics & Computers / Laptops |
| camera | Electronics & Computers / Cameras |
| audio | Electronics & Computers / Headphones & Speakers |
| console | Video Games & Consoles / Consoles |
| empty / missing / unknown | Other |

Valid category with an absent/invalid/unrelated subcategory keeps its category and
omits the subcategory. Old terms are read, not migrated. Existing demo deals are
not overwritten when seeding again; only newly created demo examples get new keys.
Categories are part of terms JSON, so the existing normal acceptance/hash/lock
covers them automatically. No new verification behavior is introduced.

## Form choices for owner review

- Category is required in the browser form. Existing API clients/old deals can still
  omit it; server validation/behavior stays unchanged as requested.
- Subcategory is optional. Changing category clears its selection; Other hides it.
- Existing checks remain when switching category, including checks added earlier.
  Nothing removes Seller lines; templates merge and avoid duplicate existing lines.
- “Checklist added. You can edit it.” appears only for attached template choices.
- Condition stays free text; optional quick-picks were omitted during feature freeze.
- Adding classification to an AI draft is recorded as an edit by the existing receipt comparison; no receipt logic changed.
- AI draft application clears category/subcategory so Seller explicitly chooses;
  manual restoration retains the prior values. No AI output-schema change.
- Watch examples use Wearables; keyboard uses Computer Parts & Accessories; helmet
  uses Bicycles / Parts & Accessories; lamp uses Small Appliances; drone uses Other
  electronics; stove uses Camping & Hiking. Those are demo classification choices,
  not new rules, filters or evidence criteria.

## Verification

Node 22.23.4: npm test **536 passed / 52 files**, typecheck **pass**, build **pass**,
git diff --check **pass**. No existing assertion weakened: seeded category assertions
were added alongside existing audit-chain/state checks; old replay fixture retained.
New unit coverage includes required native Category, initial hidden Subcategory,
unchanged decimal keyboard/pattern, unique slugs, Other endings, legacy mapping,
wrong-parent rejection, five template attachments, custom-line preservation and
submission's categoryTerms helper. Actual UI submission is verified below.

Production browser: 390/1440px × light/dark × Smartphones/Furniture = **8 actual
form submissions**, HTTP 201. Smartphones merges the Phone checklist; Furniture /
Tables & Desks adds none. Checked actual POST terms IDs/amount/custom criteria,
category reset, Other hiding subcategories, repeated merge without duplicates,
then stored category/subcategory chip on deal heading, category chip on Transactions
and Home. No browser console warnings/errors, page exceptions or horizontal overflow.
PAYPAL_MODE=simulated, AI_MODE=replay, fresh isolated SQLite database with synthetic
seed/QA deals. No real provider/payment calls. Original amount validation unchanged.

Screenshots: docs/ui/screens/new-deal-categories/ — four baseline New deal captures
from isolated main build; eight filled new-form captures. JSON records real submission
checks. Headless native selects use local browser rendering. No new package/tooling.

PR publication status: latest docs/HANDOFF.md entry. No merge/deployment.
