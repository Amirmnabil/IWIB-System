# IWIB Hub — UI/UX Refinement Execution Prompt (v1)

**Target agent:** Antigravity (Gemini)
**Repo:** `D:\IWIB\IWIB System\SYSTEM` (Next.js App Router + Tailwind + shadcn/ui + Supabase)
**Mode:** REFINEMENT ONLY — **NOT a redesign.**

---

## 0. GROUND RULES — read before touching anything

1. **Do not redesign.** Do not change page layouts, component structure, routing, business logic, calculations, or data flow. You are only normalising typography, spacing, emphasis, scroll behaviour, and label length.
2. **Do not rename or delete** any existing component, prop, route, or database column.
3. **Do not change any financial calculation**, premium proration, commission logic, or census sync logic.
4. **Additive SQL only.** Every schema change must be `ADD COLUMN IF NOT EXISTS`. No `DROP`, no `ALTER ... TYPE`, no data deletion. Legal/regulatory names must stay intact (FRA compliance).
5. **Work phase by phase, in the given order.** After each phase: run `npm run build`, confirm zero TypeScript errors, then stop and report before starting the next phase.
6. **RTL must keep working.** The app is bilingual (EN / AR via `useI18n()` → `isRtl`). Every change must be verified in both directions.
7. If a change would affect more than the files listed in a phase, **stop and ask** instead of expanding scope.

---

## PHASE 1 — Fix the modal shell (highest impact, smallest diff)

### Problem
`src/components/ui/dialog.tsx` → `DialogContent` currently carries `max-h-[94vh] overflow-y-auto`. That makes **the dialog itself a scroll container**. Any dialog that also has an internal scroll area produces **two scrollbars**. It also means headers and footers scroll away with the content.

Audit result:
- 26 `<DialogContent>` instances total.
- **19** do not override with `overflow-hidden` → outer scroll active.
- **4 confirmed double-scrollbar dialogs**, all in `src/app/(app)/client/census/page.tsx` (lines ~4926, ~5516, ~5735, ~6745).
- `src/components/endorsements/EndorsementDetails.tsx:1278` has `<ScrollArea className="flex-1 min-h-0 overflow-y-auto ...">` — Radix `ScrollArea` already owns a scrollbar; adding `overflow-y-auto` to its root guarantees a second one.
- `src/components/shared/FormDialog.tsx` is **already correct** — use it as the reference pattern.

### Actions

**1.1** In `src/components/ui/dialog.tsx`, change `DialogContent`'s class string:

- Remove: `overflow-y-auto`, `custom-scrollbar`
- Change: `max-h-[94vh]` → `max-h-[88vh]`
- Add: `overflow-hidden flex flex-col`
- Change: `sm:rounded-[2rem]` → `sm:rounded-2xl` (see Phase 4)
- Change: `gap-6` → `gap-0`
- Change: `p-6 md:p-8` → `p-0`

**1.2** In the same file, make the sub-parts own the padding, and make only the body scroll:

- `DialogHeader`: add `shrink-0 px-6 pt-6 pb-4 border-b border-border`
- `DialogFooter`: add `shrink-0 px-6 py-4 border-t border-border bg-card` (remove `pt-6 border-t border-slate-50 mt-2`)
- Add and export a **new** component `DialogBody`:
  ```
  flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-5
  ```

**1.3** `DialogTitle` currently uses `text-metric` (32–40px). Change it to:
`text-lg font-semibold tracking-tight text-foreground` — see Phase 2.

**1.4** Because `DialogContent` no longer has padding, **every existing `<DialogContent>` must be checked**. For each of the 26 instances:
- If its children are already wrapped in an explicit padded/scrolling structure (`p-0 overflow-hidden flex flex-col` pattern — 7 instances), leave the inner structure alone.
- Otherwise, wrap the children in `<DialogBody>` and move any `<DialogFooter>` outside it.

**1.5** Remove `overflow-y-auto` / `overflow-auto` from the root of **every** `<ScrollArea>` in the repo. `ScrollArea` and native overflow must never be combined. (Known: `EndorsementDetails.tsx:1278`.)

**1.6** Fix the 4 confirmed double-scroll dialogs in `src/app/(app)/client/census/page.tsx` by converting them to the `FormDialog` shell pattern: outer `overflow-hidden flex flex-col`, exactly one inner `flex-1 min-h-0 overflow-y-auto`.

**1.7** Remove nested third-level scroll containers inside dialogs. In `src/components/endorsements/EndorsementDetails.tsx` lines ~1094, ~1152, ~1187, the `max-h-[300px]` boxes sit inside an already-scrolling dialog body. Keep `overflow-x-auto` (tables need it), remove the `max-h-[300px]` vertical cap.

### Acceptance criteria
- Open any modal in the app: **exactly one vertical scrollbar**, and it belongs to the body.
- Dialog header and footer stay pinned while the body scrolls.
- Action buttons (Save / Cancel / Approve) are always visible without scrolling.

---

## PHASE 2 — One typographic system

### Problem
Four font families and two conflicting heading scales are live at once.

| Issue | Evidence |
|---|---|
| `font-mono` used **131×** but never defined in `tailwind.config.ts` | Falls back to the OS monospace — Consolas on Windows, Menlo on macOS. Primary cause of "the font changes between pages". |
| `font-headline` = Inter, `font-body` = Plus Jakarta Sans | Two Latin families in the same card. |
| `globals.css` sets `h1 → 18–22px semibold` | But `page-header.tsx` sets `h1 → 32–40px font-black`, and `endorsements/page.tsx` sets `text-3xl font-black` |
| `CardTitle` = `text-metric` (**32–40px bold**) used **111×** | A card section title rendering at KPI-number size. Single biggest cause of wasted vertical space. |
| `DialogTitle` = `text-metric` used **26×** | Same problem inside modals. |
| 8 different `<h1>` sizes across pages | `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`, `text-6xl`, `text-[32px]/[40px]`, `text-metric` |
| `uppercase tracking-wider` used **174×** | Label style applied so widely it stops signalling anything. |

### Actions

**2.1** `src/app/layout.tsx` — add one defined monospace font and drop the second Latin family:
- Import `JetBrains_Mono` from `next/font/google` with `variable: '--font-mono'`, subsets `['latin']`.
- Add `${jetbrainsMono.variable}` to the `<html>` className.
- Keep the `Inter` import only if something still needs it after 2.2; otherwise remove it to cut one font download.

**2.2** `tailwind.config.ts` → `theme.extend.fontFamily`:
- `mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']`  ← **new, required**
- `headline: ['var(--font-jakarta)', ...]`  ← changed from `--font-inter`, so headings and body share one family
- Leave `arabic` (Cairo) as is.

**2.3** `src/app/globals.css` — replace the conflicting type block with one scale. These are the **only** approved heading sizes:

| Token | Size | Weight | Use |
|---|---|---|---|
| `h1` / `.text-page-title` | `text-2xl` (24px) | `font-bold` | One per page, in `PageHeader` only |
| `h2` / `.text-section-title` | `text-base` (16px) | `font-semibold` | Card titles, dialog titles |
| `h3` | `text-sm` (14px) | `font-semibold` | Sub-sections |
| `h4` | `text-sm` (14px) | `font-medium` | Field groups |
| `.text-metric` | `text-3xl` (30px) | `font-bold` + `tabular-nums` | **KPI numbers only — never a title** |
| `p` / body | `text-sm` (14px) | `font-normal` | — |
| `.text-label` | `text-xs` (12px) | `font-medium` + `text-muted-foreground` | Field labels |

Also in `globals.css`:
- Remove `tracking-wide` from the `body` rule. Positive letter-spacing on 14px text inflates every layout.
- Add a `.tabular` utility: `font-variant-numeric: tabular-nums; font-feature-settings: "tnum";`

**2.4** `src/components/ui/card.tsx` → `CardTitle`: change `text-metric font-headline` to `text-base font-semibold tracking-tight`.
This one line fixes 111 oversized titles.

**2.5** `src/components/ui/dialog.tsx` → `DialogTitle`: `text-lg font-semibold tracking-tight` (done in 1.3).

**2.6** Replace `font-mono` with `.tabular` wherever it is applied to **money, dates, counts, or percentages**. Keep `font-mono` **only** for true identifiers: policy numbers, endorsement reference numbers, national IDs, membership numbers. Expect roughly 131 → ~40 remaining usages.

**2.7** Normalise the 8 rogue `<h1>` declarations to the single `PageHeader` (Phase 3). The marketing page `src/app/home/page.tsx` is **exempt** — leave its `text-5xl/6xl` hero alone.

**2.8** Reduce `uppercase tracking-wider` to **KPI card labels and table headers only**. Everywhere else, use `.text-label` in sentence case.

### Acceptance criteria
- Exactly **two** Latin families load (Plus Jakarta Sans + JetBrains Mono) plus Cairo for Arabic.
- No `text-metric` on any title.
- No heading size outside the table in 2.3.

---

## PHASE 3 — One page header

### Problem
- 36 pages use `PageHeader`; **14 pages hand-roll their own header** (`endorsements`, `dashboard`, `policies/[id]`, `companies/[id]`, `prospects/[id]`, `benefit-schedules`, `client/census`, `insurance-companies/[id]`, `underwriting/medical-pricing`, `underwriting/motor-pricing`, `underwriting/quotations`, `endorsements/[id]`, `endorsements/create`, `companies/new`).
- `PageHeader` renders a 40px `font-black` title — no page needs that.
- The `description` subtitle is on by default and most pages fill it with a sentence the user reads once and then scrolls past forever.

### Actions

**3.1** `src/components/shared/page-header.tsx`:
- Title: `text-[32px] md:text-[40px] font-headline font-black` → `text-2xl font-bold tracking-tight text-foreground`
- Wrapper: `mb-4` → `mb-5`
- Add prop `subtitle?: boolean` (default `false`). Render `description` **only when `subtitle` is `true`**. Keep the `description` prop so no call site breaks.
- Action button: keep `h-8 text-xs`, but replace the hardcoded `bg-[#2A75F3] hover:bg-[#1a65e3]` with `bg-primary hover:bg-primary/90` (see Phase 6).

**3.2** Migrate all 14 hand-rolled headers to `<PageHeader>`. Pass existing action buttons through `children`.

**3.3** Turn the subtitle back on (`subtitle`) for **only** these pages, where it carries real information:
- `analytics/consumption/basic` — "Phase 1: …"
- `analytics/consumption/advanced` — "Phase 2: …"
- `analytics/consumption/forecasting` — "Phase 3: …"
- `master-data/reference-lists` — "Manage master data, lookup lists, and system databases"

Every other page: remove the `description` or leave `subtitle` off.

### Acceptance criteria
- Every page in `(app)` renders its title through `PageHeader`.
- Roughly 60–70px of vertical space reclaimed per screen.

---

## PHASE 4 — Spacing, padding, radius

### Problem
- `src/app/(app)/layout.tsx` `<main>` already applies `p-4 lg:p-6`, yet ~15 pages add another `p-6` on their root div → **48px gutters**. Other pages use `p-0`. No two pages match.
- Radius is used at 7 different values: `rounded-md` (62), `rounded-lg` (286), `rounded-xl` (371), `rounded-2xl` (164), `rounded-3xl` (61), `rounded-[2rem]` (9), `rounded-full` (189).
- `--radius` is defined as `0.75rem` in `globals.css` but almost nothing uses it.

### Actions

**4.1** `<main>` in `src/app/(app)/layout.tsx` keeps `p-4 lg:p-6`. **Remove the root-level `p-*` from every page component.** Pages start at `space-y-5`, no padding.

**4.2** Standardise vertical rhythm — approved values only:
- Between major page sections: `space-y-5`
- Inside a card: `space-y-4`
- Between a label and its field: `space-y-1.5`
- Retire `space-y-8`, `space-y-6`, `space-y-3`, `space-y-0`.

**4.3** Standardise card padding: `CardHeader` `p-6` → `px-5 py-4`; `CardContent` `p-6 pt-0` → `px-5 pb-5 pt-0`.

**4.4** Standardise radius to **three** values and nothing else:
- `rounded-lg` → buttons, inputs, badges, small controls
- `rounded-xl` → cards, panels, dialogs, table containers
- `rounded-full` → avatars, pills, icon buttons

Replace every `rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`, `rounded-md` accordingly. Keep `--radius: 0.75rem`.

**4.5** KPI card icon containers: `w-14 h-14` → `w-10 h-10`, icon `w-7 h-7` → `w-5 h-5`.

### Acceptance criteria
- No page adds padding on top of `<main>`.
- Only `rounded-lg`, `rounded-xl`, `rounded-full` appear in `src/`.

---

## PHASE 5 — Short display names (SQL + Master Data / Reference Lists)

### Problem
Labels like `Deletion Endorsement (member/s termination)` come from the **database**, not the UI.

- Source table: `public.endorsement_types` — columns `code`, `name`, `name_ar`, `line_of_business`, `category`, `is_financial`. Seeded in `supabase/migrations/20260825120000_seed_taxonomy_endorsements.sql` (100 rows).
- A parallel table `public.master_endorsement_types` exists with the same 100 rows (`supabase/migrations/20260826000000_seed_master_endorsement_types.sql`). **Two tables holding the same taxonomy — flag this, do not resolve it in this pass.**
- The Master Data → Reference Lists screen (`src/app/(app)/master-data/reference-lists/page.tsx`) is the single editor for **36 lookup tables**. Its `FIELD_CONFIG` (lines 63–96) shows exactly which columns are editable. **Not one of these tables has a `short_name` column**, so there is nowhere to store a display label.

This is why the fix must be **systemic**, not a hardcoded map in the Endorsements page.

### 5.1 SQL — new migration (run against Supabase)

Create `supabase/migrations/20260921000000_add_short_names_to_reference_tables.sql`.

**Part A — add the columns (additive, idempotent):**

```sql
-- Add short display names to every reference/lookup table.
-- `name` / `name_ar` remain the legal/regulatory full names and are NEVER changed.
-- `short_name` / `short_name_ar` are display-only, used in tables, lists, chips and dropdowns.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'industries','departments','locations','company_statuses','priorities',
    'product_types','product_subtypes','client_types','activity_types','activity_statuses',
    'claim_types','claim_statuses','endorsement_types','master_endorsement_types',
    'invoice_types','kyc_document_types','payment_methods','pipeline_stages','provider_types',
    'benefit_classes','network_types','related_types','company_sizes','sources',
    'currencies','payment_frequencies','role_levels','coverage_types',
    'eligibility_types','rule_types','medical_networks'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS short_name text;', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS short_name_ar text;', t);
    END IF;
  END LOOP;
END $$;
```

**Part B — backfill `endorsement_types` and `master_endorsement_types`** with the short labels. Apply to both tables by `code`. Full names stay untouched.

| code | short_name | short_name_ar |
|---|---|---|
| G-MED-ADD | Addition | إضافة |
| G-MED-DEL | Deletion | حذف |
| G-MED-UPG | Plan Upgrade | ترقية خطة |
| G-MED-DWN | Plan Downgrade | تخفيض خطة |
| G-MED-HTU | Headcount True-up | تسوية العدد |
| G-MED-BREC | Bordereau Rec. | تسوية الكشف |
| G-MED-BLA | Benefit Limit | حدود المنافع |
| G-MED-SIA | Sum Insured | مبلغ التأمين |
| G-MED-TNA | Network Tier | مستوى الشبكة |
| G-MED-DC | Data Correction | تصحيح بيانات |
| G-MED-REN | Renewal | تجديد |
| G-MED-TERM | Termination | إنهاء |
| G-MED-REIN | Reinstatement | إعادة تفعيل |
| G-LIFE-ADD | Addition | إضافة |
| G-LIFE-DEL | Deletion | حذف |
| G-LIFE-SAA | Sum Assured | مبلغ التأمين |
| G-LIFE-BC | Beneficiary | المستفيد |
| G-LIFE-AR | Age Reclass. | تصنيف العمر |
| G-LIFE-OR | Occupation Reclass. | تصنيف المهنة |
| G-LIFE-EXT | Extension | تمديد |
| G-LIFE-REN | Renewal | تجديد |
| G-LIFE-CANC | Cancellation | إلغاء |
| PROP-SII | SI Increase | زيادة المبلغ |
| PROP-SID | SI Decrease | تخفيض المبلغ |
| PROP-LOC-ADD | Location Add | إضافة موقع |
| PROP-LOC-DEL | Location Delete | حذف موقع |
| PROP-SVA | Stock Value | قيمة المخزون |

**For every remaining code in the two tables** (the seeds hold 100 rows each), derive `short_name` with this rule and write it into the migration explicitly — do not compute it at runtime:
1. Strip a trailing `Endorsement`.
2. Strip any trailing parenthetical `( ... )`.
3. Trim, collapse whitespace, cap at **24 characters**; if longer, abbreviate the last word (`Reconciliation` → `Rec.`, `Reclassification` → `Reclass.`, `Amendment` → `Amend.`).

Use `UPDATE ... WHERE code = '...'` statements, one per row. Wrap Part B so it is safe to re-run.

**Part C — safety net** (so nothing ever renders blank):
```sql
UPDATE public.endorsement_types
   SET short_name = COALESCE(NULLIF(btrim(short_name),''), name)
 WHERE short_name IS NULL OR btrim(short_name) = '';
UPDATE public.endorsement_types
   SET short_name_ar = COALESCE(NULLIF(btrim(short_name_ar),''), name_ar)
 WHERE short_name_ar IS NULL OR btrim(short_name_ar) = '';
```
Repeat for `master_endorsement_types`.

### 5.2 Master Data → Reference Lists UI

In `src/app/(app)/master-data/reference-lists/page.tsx`:

**5.2.1** Update `FIELD_CONFIG` (lines 63–96). For every table listed in the SQL array, insert `'short_name', 'short_name_ar'` immediately after `'name', 'name_ar'`. Example:
```ts
endorsement_types: ['code', 'name', 'name_ar', 'short_name', 'short_name_ar'],
```
This is what makes the short labels **editable by the business user from inside the system** — no future code change needed to rename a label.

**5.2.2** In the add/edit form for these tables, label the fields clearly:
- `name` → "Full name (legal — appears on printed endorsements)"
- `short_name` → "Short label (appears in tables and lists, max 24 chars)"
- Add a soft `maxLength={24}` warning on the short fields.

**5.2.3** If `short_name` is empty when a row is saved, auto-fill it from `name` using the same rule as Part B, client-side, before insert.

### 5.3 Frontend display helper

Create `src/lib/utils/display-name.ts`:
```ts
export function displayName(row: any, isRtl: boolean): string {
  if (!row) return '';
  return isRtl
    ? (row.short_name_ar || row.name_ar || row.short_name || row.name || '')
    : (row.short_name   || row.name    || '');
}

export function fullName(row: any, isRtl: boolean): string {
  if (!row) return '';
  return isRtl ? (row.name_ar || row.name || '') : (row.name || '');
}
```

**The rule, applied everywhere:**

| Context | Which name |
|---|---|
| Tables, lists, cards, chips, filter dropdowns, KPI labels | `displayName()` + `title={fullName()}` tooltip |
| Detail pages, printed endorsement documents, PDF exports, Excel exports, emails, audit logs | `fullName()` — **always the legal full name** |

**5.4** Apply in:
- `src/app/(app)/endorsements/page.tsx` — the Type column (`end.endorsement_type?.name` → `displayName(...)`) and the type filter dropdown. Also update the `select` on line 95 to `'id, name, name_ar, short_name, short_name_ar'`.
- `src/components/endorsements/create-endorsement-wizard.tsx` — type picker list.
- `src/components/endorsements/EndorsementDetails.tsx` — **header uses `displayName`, the printed/exported document keeps `fullName`.**
- Any other list rendering a reference-table `name`.

**5.5** While in the Endorsements table: the word "Endorsement" repeated in every row of a page titled "Endorsements Hub" is redundant — the short names above already remove it. Do not reintroduce it.

### Acceptance criteria
- Migration applies cleanly and is re-runnable.
- `Deletion Endorsement (member/s termination)` renders as **`Deletion`** in the table, with the full name on hover.
- The printed endorsement PDF still shows the full legal name.
- Amir can edit any short label from Master Data → Reference Lists without a code change.

---

## PHASE 6 — Emphasis and colour

### Problem
- `font-bold` / `font-black` is applied to IDs, client names, amounts, table headers, buttons, KPI values and card titles simultaneously. When everything is bold, nothing is.
- Two competing primary blues: `--primary` = `#1E3A8A` (navy) in `globals.css`, but `#2A75F3` (bright blue) is hardcoded in buttons and link text.
- **Verify with Amir before changing:** in `src/app/(app)/endorsements/page.tsx`, `getImpactTextClass()` renders a *positive* premium impact in **red** (`text-rose-600`) and a *negative* impact in **green**. For a brokerage, added premium is usually income. If this is intentional (cost-to-client framing), leave it and add a legend; if not, swap the two.
- 55 inline `<Badge className="bg-...">` bypass the shared `StatusBadge` component (used in only 22 places).

### Actions

**6.1** Emphasis ladder — the only approved weights:
- `font-semibold` → the single most important value in a row (the record ID **or** the amount, not both) and all headings
- `font-medium` → normal body and table cells
- `font-normal` + `text-muted-foreground` → labels, hints, dates, secondary lines

Remove `font-black` from the entire app except `src/app/home/page.tsx`.

**6.2** Table headers: `text-xs font-bold uppercase tracking-wider text-slate-500` → `text-[11px] font-medium uppercase tracking-wider text-muted-foreground`. Uppercase alone is enough signal.

**6.3** Replace every hardcoded `#2A75F3`, `bg-blue-600`, `text-blue-600` used as *the* primary action colour with `bg-primary` / `text-primary`. Semantic colours (emerald / rose / amber for status) stay.

**6.4** Move the 55 inline status badges onto the shared `src/components/shared/status-badge.tsx`. Extend that component with any missing status variants rather than adding new inline ones.

**6.5** Replace the native `confirm()` in `src/app/(app)/endorsements/page.tsx:721` (bulk delete) with shadcn `AlertDialog`. Search for other `confirm(` / `alert(` calls and replace them too.

---

## PHASE 7 — Tables

### Problem
- `src/app/(app)/endorsements/page.tsx` applies `whitespace-nowrap` ~20 times — on `<table>`, `<thead>`, every `<tr>` and nearly every `<td>`. The table can never wrap, so it forces a horizontal scrollbar inside the card and the Action column is cut off at 1100px width (verified in the live app).
- Three different table implementations coexist: shared `DataTable` (23 pages), hand-rolled `<table>` (15 pages), shadcn `<Table>` (3 pages).

### Actions

**7.1** In the Endorsements table, keep `whitespace-nowrap` **only** on: ID/Ref, LoB, Effective Date, Financial Impact, Status, Action. Remove it from `<table>`, `<thead>`, `<tr>`, and from the Client/Policy and Type columns. Add `max-w-[220px] truncate` to the Client column.

**7.2** Standardise table cell padding: header `px-4 py-2.5`, body `px-4 py-3` (down from `p-4`).

**7.3** Do **not** rewrite the 15 hand-rolled tables in this pass. Instead, produce a report listing them with a recommendation to migrate to `DataTable` later. Flag it as technical debt.

---

## PHASE 8 — Verification (required before reporting done)

1. `npm run build` — zero TypeScript errors, zero new ESLint errors.
2. Walk these pages at **1280px and 1440px**, in **both EN and AR**:
   - Dashboard · Endorsements Hub · Endorsement Details modal · Create Endorsement wizard · Policies list · Policy detail · Census · Client Census · Claims · Invoices · Master Data → Reference Lists · Underwriting → Medical Pricing
3. For each, confirm:
   - [ ] One page title, 24px, no oversized card titles
   - [ ] Exactly one scrollbar per modal
   - [ ] No horizontal scrollbar on the Endorsements table at 1280px
   - [ ] Modal footers pinned and visible
   - [ ] One Latin font family in the UI chrome, monospace only on true identifiers
   - [ ] RTL mirrors correctly, Cairo still applied
4. Confirm the migration applied: `SELECT code, name, short_name, short_name_ar FROM endorsement_types ORDER BY code LIMIT 20;`
5. Confirm `short_name` is editable in Master Data → Reference Lists → Endorsement Types.
6. Confirm a printed/exported endorsement still shows the **full legal name**.

---

## Report format

After each phase, report:
- Files changed (count + list)
- Any place where following the instruction would have broken something, and what you did instead
- Anything you skipped and why
- Screenshots before/after for the pages in Phase 8 step 2

**Do not proceed to the next phase without explicit approval.**

---

## Known issues flagged but deliberately OUT OF SCOPE

| Issue | Note |
|---|---|
| `endorsement_types` and `master_endorsement_types` hold the same 100-row taxonomy | Duplicate source of truth. Needs a separate consolidation decision. |
| 15 hand-rolled `<table>` implementations | Migrate to `DataTable` in a later pass (Phase 7.3). |
| `body[style*="pointer-events: none"] { pointer-events: auto !important }` in `globals.css` | A workaround for a Radix dialog bug. Leave it; revisit after the Radix version is upgraded. |
| Bulk delete in Endorsements loops `DELETE` per row client-side | Performance/atomicity concern, not UI. Separate task. |
