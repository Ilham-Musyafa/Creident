# Item categories: implementation plan

Status: proposed, planning only. Date: 2026-10-26. No implementation authorized by
this document. Brand/manufacturer selection is out of scope.

## 1. Baseline, branch and scope

- Planning branch: `plan/item-categories`, created from latest fetched
  `origin/main`, `9a1acd1` (Records PR #86). Only this file is added; no PR requested.
- `origin/ui/creident-mockup` is still unmerged, at `3d98b87`. Its mobile Home,
  shared MobilePanel and persistent desktop shell must be retained when this plan
  is implemented. Latest fixes are `4f237d5` with publication notes in `3d98b87`.
- Read AGENTS.md, README.md, DESIGN.md, UI.md and HANDOFF.md on main, plus the
  design branch's latest handoff. Main's UI guide still describes older navigation;
  use the approved design branch as the visual baseline after it merges.
- Follow the requested one-file exception: do not update HANDOFF.md or other docs
  for this planning task. The plan itself records the investigation and next steps.
- Physical goods only. No payment, R1–R7, state-machine, deadline, audit algorithm,
  dependency, database or seed changes in this task.

Goal: a Seller classifies an item in a few selections; Buyer and Reviewer see the
same classification before acceptance and on the resulting deal/record.

## 2. What exists today

| Area | Files and observed behavior |
| --- | --- |
| Domain | `src/lib/domain/types.ts`: `Tx` contains state/payment/deadline facts. No typed terms or hierarchical category belongs to the state machine. |
| Stored deal | `src/lib/repository.ts`: `StoredTx extends Tx`, adding item, parties, amount, `termsJson` and optional `termsHash`. `createTransaction` inserts the deal and creation event together; `loadTransaction` and `listTransactions` return the stored JSON unchanged. |
| SQLite/migrations | `src/lib/db.ts`: `migrate()` is the migration mechanism, rather than a separate migration directory. `transactions.terms_json` is valid JSON text; `terms_hash` is separate. `term_acceptances` stores each role's accepted hash. Events are append-only. No category column. |
| Create page/form | `src/app/deals/new/page.tsx` gates Seller; `src/components/NewDealForm.tsx` groups Item details, What's included and Buyer checks. Desktop has a sticky summary; mobile stacks it. `TermsListEditor.tsx` supplies editable included/check rows. |
| Existing category collision | NewDealForm already stores optional `terms.category`, holding checklist template IDs `phone`, `laptop`, `camera`, `audio`, `console`. Its current Item type selector merges checks through `src/lib/termsTemplates.ts`. It is not a three-level classification. |
| Create API | `src/app/api/transactions/route.ts` delegates to `src/app/api/_shared/handlers.ts#createTransaction`. Top-level keys are allowlisted; `terms` accepts a JSON object canonicalized with an 8 KB limit. No complete terms-field schema currently exists. |
| Acceptance/locking | `acceptTerms` hashes stored terms JSON; repository `recordAcceptance` records `TERMS_ACCEPTED` with that hash and rejects mismatched acceptance hashes. Both parties accepting triggers `TERMS_LOCKED` through the existing path. NewDealForm immediately calls Seller acceptance after creation. No general terms-edit endpoint exists. |
| Demo/seed | `src/lib/demoSeed.ts`: `DemoSpec.terms` is a record, canonicalized on creation; names, terms and money events have explicit demo/simulation labels. Existing 13 demo examples and their replay inputs must remain intact. |
| AI draft | `src/lib/ai/termsFields.ts` defines exactly item, condition, includedItems, criteria. `src/lib/ai/terms.ts` uses `terms-v1`, exact-key validation, bounded output and prompt-injection precautions. `termsSamples.ts` and `terms-replay.json` supply synthetic replay examples. |
| AI route/provenance | `src/app/api/ai/terms-draft/route.ts` returns draft/meta and a signed receipt without creating a deal. `src/lib/ai/termsReceipt.ts#acceptedTermsAudit` compares submitted terms to the original draft and records unchanged/edited. NewDealForm currently clears `category` when applying a draft. |
| Deal/acceptance UI | `src/app/deals/[id]/page.tsx` resolves legacy `terms.category` through TERMS_TEMPLATES under Locked terms. `src/components/TermsChecklist.tsx`, used on `/deals/[id]/checkout`, shows description, included items and criteria, but currently no category. |
| Lists | `src/components/transactionsView.ts` parses terms, uses legacy category or item-title patterns for the icon, and creates TransactionRow. `MobileTransactionRow.tsx`, `TransactionsBrowser.tsx`, and desktop Home render those views. No hierarchical path is exposed today. |
| Records | `src/app/audit/page.tsx` already calls transactionRow for mobile icon/status/name data. `src/app/audit/[id]/page.tsx` loads the deal and displays chain/checkpoint status plus event steps. A category is not presently an event label. |
| Downstream consumers | `src/lib/reviewPipeline.ts`, `src/lib/ai/evidenceCheck.ts`, `src/lib/ai/copilot.ts`, `src/lib/decisionBasis.ts`, and `src/lib/evidencePdf.ts` read terms or their hash. Categories must not become an independent decision or payment input. |

## 3. Recommended storage: one optional path inside terms

Add an optional **`terms.itemCategoryPath` string**, for example:

```json
{
  "condition": "Used; see description",
  "description": "Seller's description",
  "itemCategoryPath": "electronics/pc-parts/gpu",
  "criteria": ["Seller's editable agreed check"]
}
```

The example is a proposed shape, not demo data to seed. Keep existing
`terms.category` untouched as the legacy checklist-template identifier. Never
reuse that key to hold an object or change the meaning of already stored values.

Why this is the smallest change:

- No SQLite migration, new column, repository serialization change or Tx/state
  type change. New presentation types can expose an optional resolved category.
- One validated terminal path avoids three conflicting stored fields. The picker
  can keep its intermediate selections locally and submit only the terminal path.
- Existing clients may omit it. Existing deals have no path; absence means
  **unspecified**, not Other. Do not add an empty string, null or a default to old JSON.
- New category paths are part of the exact terms accepted by both parties. Their
  bytes are covered by the existing terms hash and audited acceptance/lock path.
  Creation already records a terms hash; it does not store the complete terms in
  its payload. A hash commits to the category but cannot reconstruct its text.
  Do not add a redundant category event just for this feature.

### Locked terms versus separate metadata

| Option | Benefit | Cost / risk | Recommendation |
| --- | --- | --- | --- |
| Optional path in terms JSON | Uses existing persistence and consent/hash flow; both parties agree to the classification; minimal write surface. | Cannot be corrected after acceptance without a separately designed amendment flow. Additional agreed text can affect AI input; see section 7. | **Choose this.** Select before Create deal link; after creation show read-only. |
| Three optional term fields or nested object | Explicit levels. | More validation and invalid combinations; nested objects add noise to the existing generic review fallback. | Unnecessary for a tiny hierarchy. |
| Separate deal metadata / SQL column | Could change classification without invalidating locked terms; indexed filters later. | Migration/repository/API/event policy work; a changed label could contradict what Buyer accepted; current terms hash would not cover it. | Defer unless post-lock editorial categorization becomes a distinct requirement. |

Do not add a post-creation edit/re-acceptance feature. Although status can still be
DRAFT, the form already accepts as Seller. If misclassified, the current release
must not silently amend the accepted terms.

### Write/read contract

- Validate only the new optional field in the existing create handler: if present,
  it must be a trimmed known terminal path string, at most 80 ASCII characters.
  Reject null, empty, array/object, unknown IDs, nonterminal parents and impossible
  combinations with a field-specific 400 error before writes or Seller acceptance.
- Preserve existing unrelated/legacy terms handling and the total terms/request
  limits. Do not broadly tighten the whole terms schema in this feature.
- No top-level request key is needed: the path is inside the existing `terms` object.
- Reads must tolerate absence and unexpected historical values. Show a neutral
  Unrecognized category only where a value actually exists; never crash, invent a
  path or silently write a normalization back to storage.
- Use stable IDs, not display strings or translated breadcrumbs. Labels and IDs
  for published paths are retained; retired paths remain readable. Never reuse a
  path for a different meaning. A substantive rename/move requires a new path and
  retained historical definition. This keeps old accepted classifications legible.
- Existing `terms.category` may still supply a legacy item-type label/icon. Render
  that label as a legacy item type if needed, not as an inferred agreed hierarchy.
  Prefer an explicit new path when both fields exist; don't show two contradictory
  classification chips. The old template choice remains separate from classification.

## 4. Small taxonomy and ownership

Proposed browser/server-safe source: **`src/lib/itemCategories.ts`**, a single typed
constant tree (`as const`) with stable IDs, labels and terminal nodes. Co-locate pure
lookup, terminal-path validation, breadcrumb and legacy display helpers there.
No React, database, AI provider or payment imports. Tests in its adjacent test file.

```text
Electronics                          electronics
  PC Parts                           electronics/pc-parts
    CPU                              .../cpu
    Motherboard                      .../motherboard
    GPU                              .../gpu
    RAM                              .../ram
    Storage (SSD/HDD)                .../storage
    PSU                              .../psu
    Case                             .../case
    CPU Cooler                       .../cpu-cooler
    Other PC part                    .../other-pc-part
  Phones & Tablets                   electronics/phones-tablets
    Phone                            .../phone
    Tablet                           .../tablet
  Other electronics [terminal]        electronics/other-electronics
Other [terminal]                     other
```

Electronics and PC Parts are nonterminal. Other can finish after level one; Other
electronics after level two. Do not force three meaningless Other selections.
Phone/Tablet are the only proposed extra leaves beyond the owner's PC-part list;
confirm them before implementation. Storage stays one leaf: no fourth level.
Laptop/camera/audio/console remain supported by existing checklists and can use
Other electronics until a later taxonomy expansion, without deleting old labels.

Brand/manufacturer is not a node, field, selector, logo or provider lookup now.
Later it can be a separate optional facet linked to stable item-type IDs, without
changing existing paths. That extension needs its own agreement/storage plan.
Human-readable item titles remain free text; category does not identify an exact
model, serial number, capability, authenticity or completeness.

## 5. UI and display plan

### New deal: shared selection state, responsive presentation

Put **Item category (optional)** in Item details, close to the item title, before
Buyer checks. Start unselected; do not silently choose Other. Native labelled
selects are sufficient, require no library and provide the fewest new interactions:

1. Category: Electronics / Other, plus a placeholder.
2. Subcategory appears after Electronics; PC Parts / Phones & Tablets / Other
   electronics. Hide it when the chosen top-level value is terminal.
3. Item type appears only for a subcategory with leaves. Finish PC Parts in three
   selections. Keep chosen parents visible so the Seller can revise them.

Changing a parent clears incompatible descendants and the pending submitted path.
Show a quiet completion hint for an unfinished branch; block submission until
that selection is completed or explicitly cleared with Skip category. Unselected
is permitted. Clear error association with aria-describedby; announce newly
available choices without moving keyboard focus automatically.

Mobile: stack the selects inside the existing form card; reuse the MobilePanel
shell where the approved base already uses it, without redesigning the page.
Desktop: arrange the same controls in up to three columns when space permits;
retain the sticky summary and show the completed breadcrumb there. Same form
state, validation and payload on both widths; no separate mobile taxonomy.

Use globals.css tokens, DM Sans text/Plus Jakarta headings, 14px body, at least
12px metadata, visible focus and 44px controls. Test both themes. These are neutral
classification chips, not status chips: don't reuse status colors or state values.

### Preserve checklist behavior separately

Rename the old Item type checklist selector to **Checklist template (optional)**
so it cannot be confused with the new Item type level. Preserve its five existing
templates, editable merge behavior and legacy `terms.category` serialization.
Picking a classification must not automatically replace or append criteria.
The first implementation does not attempt automatic template matching.

### Display matrix

| Surface | Proposed treatment |
| --- | --- |
| New-deal summary | Live neutral breadcrumb after a complete selection; no fake placeholder path. |
| Deal detail / checkout | Full wrapping breadcrumb, e.g. Electronics › PC Parts › GPU, next to item details and in terms to accept. Extend TermsChecklist so Buyer sees it **before** accepting. |
| Reviewer view | Show the same resolved category near the item/locked terms on `/deals/[id]/review`; never infer dispute type or a decision from it. |
| Transactions / Home rows | Add optional category presentation to TransactionRow. Render one neutral breadcrumb meta chip/line without displacing amount, status, visible Demo badge, deadline or next action. Reuse across compact/noncompact mobile rows and desktop table/Home consumers. |
| Records list/detail | Reuse the breadcrumb in `/audit` rows and near the deal title/summary on `/audit/[id]`. Do not insert fabricated timeline events, steps, verification badges or counts. |
| Historical deals | No category chip if no path/legacy label exists. No misleading Other default. Existing legacy item types may remain labelled without inventing a hierarchy. |

At 390px, allow a full breadcrumb to wrap to its own meta line. Keep the whole row
tappable; the chip is descriptive, not a nested link/button. If truncation becomes
necessary later, preserve full accessible text; do not rely on hover alone.
Deal lists must still prioritize actual actions and statuses. Icons can map new
paths to an existing generic package icon first; detailed hardware icons are not
a prerequisite and need no new dependency.

Records' existing ChainStatus checks events/checkpoints. A category shown from
terms does **not** become separately verified merely because the event chain
passes. Do not add a claim that the classification is independently checked.

### Optional Transactions filter (defer)

After selection and display work, optionally add Category/Subcategory/Item type
filters that match path segments, not arbitrary string prefixes. Keep existing
`filter`/`q`, role switching, URL/back navigation and counts. Include Unspecified
for missing paths and distinguish it from explicit Other. Apply matching before
visible counts/grouping. This is local list filtering over current repository
results, not an indexed global search; current lists fetch up to 200 deals.

## 6. Optional suggested inspection criteria

**Recommendation: defer new PC-part suggestions from the first release.** Ship
manual classification and clear display first. Keep existing checklist templates.
The main risk is making a generic template look like a guarantee for every used
part; the primary benefit now is classification, not more dispute conditions.

If approved later, add curated PC templates to the existing checklist system and
offer an explicit **Add suggested checks** action before Create deal link. Preview
and merge through existing editable criteria controls; never replace typed lines,
re-add deleted lines automatically, or change terms after acceptance. Changing
category alone does not remove/add checks. Distinguish suggestions from agreed
checks until the Seller chooses them and both parties accept.

Examples to review with the owner:

- CPU: visible contacts/pins are undamaged where applicable; a socket may belong
  to the motherboard, so do not apply a universal CPU bent-socket requirement.
- GPU: no visible artifacts during an agreed test; specify test/duration and the
  evidence the parties can actually provide. Do not imply the app runs load tests.
- PSU: rated wattage matches the listing and the **listed** cables are included.
  Do not suggest opening a PSU or assume a non-modular PSU has detachable cables.

Suggestions only prefill `terms.criteria`; they add no tests performed by Creident,
payment conditions, decision branches or R1–R7 changes. The build handles text
evidence descriptions, not actual photo/video uploads or hardware diagnostics.

Extra effort: **M, roughly 1–2 focused developer days** for nine reviewed templates,
opt-in merge/edit UX, applicability copy and tests. Owner hardware/content review
is additional. Adding one safe reviewed template first is S; all nine are not S.

## 7. AI impact and recommendation

### First release: manual category, existing AI output unchanged

Keep `TermsDraft`, `terms-v1`, replay records and signed receipt format unchanged.
Applying a terms draft should preserve the Seller's chosen new category path;
manual restore must restore the corresponding manual selection, just as it does
other form state. Do not silently clear the new category as the current form
clears its legacy template choice. Classification must remain explicitly editable.

With an unchanged v1 receipt, adding a manual category makes the whole submitted
terms differ from the four-field draft projection. Existing acceptedTermsAudit
will correctly record **edited**, not reject the valid receipt. Preserve that
honest provenance; do not special-case away the category difference.

### Can AI suggest it later? Yes, but not automatically

Only as a visible editable suggestion, using the same terminal-path allowlist.
Offer Use suggested category; preserve an existing manual choice unless Seller
explicitly replaces it. Ambiguous listing/chat should return no suggestion, not
guess Other. Never generate brands, add evidence, lock terms or trigger decisions.

This is a separate **M, roughly 1–2 focused developer days** addition: new prompt
version, TermsDraft validator/output shape, receipt comparison/provenance, server
and client UI, replay fixtures/samples and injection/fallback tests must move
together. Exact-key validation means simply asking today's v1 model for an extra
key will fail. Plan a rollout for outstanding short-lived receipts; do not silently
reinterpret old prompt/output hashes. Manual creation stays available on failure.
No live-provider accuracy or security claim follows from replay tests.

### Existing downstream terms consumers: concrete caveat

`reviewPipeline.ts#criteriaFromTerms` uses explicit `terms.criteria` when supplied;
otherwise it converts **every term entry** into an `Agreed key: JSON` criterion.
Thus adding a category to a criteria-less deal will add an agreed classification
line to that existing summary input. A short scalar path fits the current 200-char
line limit; a verbose nested taxonomy snapshot would be worse.

This plan keeps that behavior, rather than changing rules or adding new hidden
criteria-generation policy. Document and test this input effect: classification
is one agreed fact, not proof of condition/completeness. If the owner requires
category to be purely decorative and excluded from review input, revisit separate
metadata or approve a separately scoped terms-projection change first.

Evidence-check uses explicit checks/condition, not the new classification as a
hardware checklist. Copilot receives locked terms; adding a term changes its full
snapshot and can miss an exact replay match. Keep current seeded/replay deals
untouched; unmatched new deals must retain the existing unavailable/manual fallback.
decisionBasis includes the full terms hash automatically; its algorithm must not
change. Check the existing evidence PDF terms rendering/size with a path, without
changing submission, payment or dispute behavior.

## 8. Compatibility, risks and tests

No backfill, re-canonicalization, seed reset or acceptance rewrite. Old stored
terms bytes, fingerprints, audit events and published checkpoints remain intact.
Read-only adapters may improve labels; they do not migrate data. Do not infer a
historical category from an item title and present it as what parties agreed.
Do not change seed terms to make screenshots richer: AI replays depend on them.
Use temporary synthetic PC deals created through the form/API for new-feature QA.

Required implementation checks:

1. **Taxonomy/helper unit tests:** each terminal path, parents rejected on writes,
   duplicate/path consistency, valid shorter fallbacks, missing/unknown/legacy
   values on reads, and parent reset/completion behavior where appropriate.
2. **Create/accept route tests** in `src/app/api/routes.test.ts`: old requests still
   work, new path round trips exactly, invalid/malformed/oversized paths rejected
   before writes, both accept the same hash, and no mutation after acceptance.
   Use normal production create/accept paths, not direct test-only hashes.
3. **Historical integrity regression:** copy representative old terms/events into
   a temporary DB, compare exact terms bytes/hash and chain head/checkpoint result
   before/after read/display. No blanket data rewrite in db.migrate/repository.
4. **AI receipt tests** in `src/app/api/ai/terms-draft/terms.test.ts`: valid v1 draft
   plus manual category is edited with original outputHash retained; tampered or
   expired receipts still fail. UI apply/restore preserves manual selection.
5. **View tests** in `src/components/transactionsView.test.ts`: expose optional
   category without altering status/action/amount/role sorting; fallback icon and
   legacy categories still work. A category never replaces the visible Demo marker.
6. **Review input regressions** in `src/lib/reviewPipeline.test.ts`: explicit
   criteria unchanged by category; criteria-less fallback includes the short
   agreed path under current rules; R5 damage/missing-parts escalation unchanged.
   Check old replay cases/decisionBasis and evidence PDF tests remain valid.
7. **Browser acceptance:** Seller creates GPU classification in 3 selections;
   change PC Parts to Other electronics, confirm stale GPU cleared; skip/Other
   work. Buyer sees category before acceptance; Reviewer and Records see same
   value. Check 390/1024/1440px, light/dark, all roles, keyboard/focus, 44px targets,
   long breadcrumb wrapping, empty/legacy cases and code-gated Reviewer behavior.
8. **Gates:** npm test, npm run typecheck, npm run build. No external PayPal call
   or live AI is needed for category QA. Check seed deal/replay counts unchanged.

Changing the classification changes the new terms hash by design. It must not
change state transitions, provider requests, amounts, deadlines or rules. Domain
and payment modules are outside the implementation diff. New validation belongs
at creation and in pure category helpers, not inside the state machine.

## 9. Reviewable sequence and branch strategy

Sizes include implementation and focused verification: S = about half a focused
day, M = about 1–2 focused days, L = several days. They are estimates, not deadlines;
existing branch conflicts or owner content review can add time.

| Step | Deliverable | Size | Suggested branch |
| --- | --- | --- | --- |
| 1 | Typed taxonomy, pure path/display helpers, terminal/fallback/legacy tests. No visible form or data change yet. | S | `feat/item-category-taxonomy` |
| 2 | Optional create validation and responsive three-level picker, separate legacy checklist control, draft preservation, acceptance/provenance tests. Atomic end-to-end category creation and preview. | M | `feat/item-category-picker` |
| 3 | Shared breadcrumb presentation across checkout/detail/Reviewer, TransactionRow consumers (mobile/desktop/Home), Records list/detail; legacy and all-role browser regressions. | M | `ui/item-category-display` |
| 4 (optional) | Transactions category filter with URL/state/count semantics and keyboard QA. | S–M | `feat/item-category-filter` |
| 5 (optional) | Reviewed opt-in PC inspection templates using existing editable merge flow. | M | `feat/pc-check-suggestions` |
| 6 (optional) | Versioned AI category suggestion with explicit use/replace UX and signed provenance/replay coverage. | M | `feat/ai-category-suggestion` |

Minimum useful scope is steps 1–3 together (roughly 3–5 focused developer days,
including integration QA); step 1 alone does not fulfill the user goal. Deliver
step 3 before calling the feature complete. Treat filters, new criteria and AI
classification as later decisions, not prerequisites for a demo recording.

Keep this plan on main-based `plan/item-categories` without cherry-picking the
unmerged UI work into it. Recommended implementation order:

1. Owner reviews/merges `ui/creident-mockup` separately when ready; do not merge it
   as a side effect of this plan.
2. Fetch latest origin/main, then create step 1's implementation branch. Merge each
   reviewed step before starting the next from refreshed main. No direct main push.
3. Use the merged shell/primitives and review changes against the approved UI.
   If design remains unmerged, defer UI implementation rather than create competing
   form/shell branches or stack this plan onto the design branch.

No security-branch changes are folded into category work. Recheck current branches
at implementation time rather than assuming today's merge state still applies.

## 10. Owner decisions before implementation

Recommended defaults (no need to decide brands now):

1. **Optional classification with terminal fallbacks:** approve PC Parts' nine
   leaves, Phone/Tablet under Phones & Tablets, Other electronics at level two,
   and Other at level one. Require completion only after starting a nonterminal
   branch; permit Skip category.
2. **Locked classification:** approve the optional path as an agreed term, selected
   before creation. No after-creation correction flow in the first release.
3. **First-release scope:** steps 1–3 only; defer the filter, new PC criteria and AI
   suggestions. Existing five checklist templates stay available separately.

If a different default is wanted, settle it before coding. No decision about
payment, dispute outcomes, provider, architecture or database is required by the
recommended plan. The plan was checked against source and with git diff --check;
application tests/build were not run for this documentation-only task.
