# Prompt for Antigravity: Repo Cleanup + Three UI Fixes

Paste everything below into Antigravity as the task instruction. This is not an audit-remediation prompt — it's a mix of a file-cleanup pass and three specific UI adjustments. Same ground rules as every prior round: no destructive action without first listing what you intend to remove and why, no editing anything not called out here, run `npm run typecheck` and `npm run lint` (and now `npm run test`, which exists as of last round) after each phase, report before moving on.

---

## Phase 1 — Delete unused / unimportant files

**Do not delete anything based on a guess. For every candidate file, confirm it is actually unreferenced before removing it** — grep the whole repo (`src/`, `supabase/`, `scripts/`, config files) for imports, requires, or string references to the filename, and check whether it's referenced from `package.json` scripts or any CI/build config. If a file is referenced anywhere, even indirectly, leave it and say why in the report instead of removing it. List every file you plan to delete *before* deleting it, in the report, with the grep evidence that nothing references it.

**Concrete candidates found during the last audit pass — verify each one, don't assume:**

- **Legacy root-level SQL files in `supabase/migrations/`** that don't follow the `YYYYMMDDHHMMSS_description.sql` naming convention used by every other file in that folder: `add_endorsements.sql`, `add_financial_movements_fixes.sql`, `add_financial_movements_schema.sql`, `add_installments_schema.sql`, `add_invoice_engine_fields.sql`, `add_invoice_financial_movements.sql`, `add_invoice_netting.sql`, `fix_endorsements_fk.sql`. These look like early ad-hoc migrations that predate the Supabase CLI's timestamp-based ordering, and several of them appear to have been fully superseded by later timestamped migrations covering the same tables (e.g. financial movements were dropped and recreated by `20260709000000_replace_adjustments_with_installments_netting.sql` and `20260828000000_recreate_financial_movements.sql`; installments by the same 0709 migration). **Do not delete these outright** — if the Supabase CLI's migration history table (`supabase_migrations.schema_migrations` or the CLI's local tracking) has already applied them, removing the files could break `supabase db reset`/replay on a fresh environment. Instead: confirm whether these files are still applied/tracked by the CLI, and if they're confirmed superseded and not part of the applied history, move them to a `supabase/migrations/_archive/` folder (or delete only if confirmed safe) rather than leaving them mixed in with the live migration set where they're easy to mistake for something still relevant.
- **`.venv/`** at the repo root — a Python virtual environment. Virtual envs should never be committed; confirm it's not already gitignored (if it's untracked but just sitting on disk, it's not a repo cleanliness issue, just a local artifact — leave it and don't touch tracked history for it). If it *is* tracked in git, add it to `.gitignore` and remove it from tracking.
- **`supabase-cli/`** at the repo root — appears to be a full CLI binary/toolchain checked into the repo (already gitignored per the `.gitignore` entry `supabase-cli/`, so likely just a local artifact, not tracked — confirm with `git ls-files` before touching).
- **`scripts/__pycache__/`** — Python bytecode cache, should never be tracked; confirm untracked/gitignored, and if tracked, remove from git and add to `.gitignore`.
- **`test.xlsx`** at repo root (47 bytes) — looks like a throwaway test fixture left at the top level rather than in a `fixtures/`/`test/` directory. Confirm nothing references it (check the medical-utilization upload flow and any test scripts) before removing.
- **`.modified`** at repo root — a 0-byte file with no discoverable purpose. Confirm it isn't a marker file some tool checks for (search for the literal filename across configs/scripts) before removing.
- **`openapi.json`** at repo root (107 bytes — unusually small for an OpenAPI spec, likely a stub or placeholder). Confirm whether anything generates or consumes it; if it's dead, remove it, if it's a stub for planned API documentation, leave it and note that in the report instead.
- **`.idx/`** at repo root — looks like Firebase Studio / Project IDX environment config, possibly left over from a different dev environment than the one now in use. Confirm it's not still used for onboarding/dev-container setup before removing.

**Also check for, beyond this list (don't limit yourself to only what's above):**
- Orphaned components under `src/components/` with no import references anywhere in `src/app/`.
- Duplicate or superseded `.js`/`.ts` scripts under `scripts/` (e.g. both `seed_sme_data.js` and `seed_sme_data.ts` exist — confirm which one is actually current/used and whether the other is dead).
- Any other stray debug/output files at the repo root beyond what's already gitignored (`errors.txt`, `missing_out.txt`, `missing_translations.txt`, `tsc_output.txt`, `build_output.log` — those are gitignored now but check whether they still exist as tracked files that need an actual `git rm`, since gitignoring going forward doesn't remove something already committed).

**Report format for this phase:** a table of every file/folder considered, what you found referencing it (or "no references found"), and the action taken (deleted / archived / left in place with reason).

---

## Phase 2 — Policy detail page: move three side-panel cards into a horizontal scroll row

File: `src/app/(app)/policies/[id]/page.tsx`. The right-hand side panel (`lg:col-span-4`, sticky, starts around line 1948) currently stacks three cards vertically, taking up the full page height alongside the main tabbed content:
- **Internal Assigned Staff** card (~line 1955)
- **Renewal Countdown & Alerts** card (~line 2011)
- **Insurer Contact Info** card (~line 2048)

Move these three cards out of the vertical sticky side panel and into a horizontally-scrollable row instead (e.g. a `flex overflow-x-auto` container with each card given a fixed/min width, snap-scroll optional), placed so it frees up vertical space at the bottom of the page for displaying data horizontally (per the ask — confirm with whoever's requesting this exactly what "data" should occupy that freed space, since that's not specified here; if there's an existing candidate on this page that's currently cramped or missing room, that's probably it, but don't guess and build a new section without confirming what goes there). Keep each card's internal content and edit-mode behavior unchanged — this is a layout/placement change only, not a content or functionality change. Verify on a real narrow viewport that the horizontal scroll works and doesn't clip card content, and check the RTL (`isRtl`) layout too, since this page supports Arabic — a horizontal scroll row needs to scroll the correct direction in RTL.

---

## Phase 3 — Dashboard: fix the Operational Modules grid to a clean 3-per-row, equal-size layout

File: `src/app/(app)/dashboard/page.tsx`, the "Operational Modules" section starting around line 193. The grid is already `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, but it isn't actually rendering as uniform 3-per-row — the code deliberately makes the 1st and 4th visible module cards double-width via `isWide = i === 0 || i === 3` → `lg:col-span-2` (an intentional "Bento" asymmetric layout, see the comment at that line: "Asymmetric col-span for Bento layout"). That's the direct cause of the uneven sizing. Remove the `isWide`/`lg:col-span-2` logic so every card renders at `lg:col-span-1` (equal size, uniform 3-per-row), and also remove the conditional extra footer row that only currently appears on the wide cards (`{isWide && (...)}` block with the "Open Workspaces & Logs" link) — either drop that footer entirely for a cleaner equal-height card, or apply it uniformly to every card so all cards stay visually consistent; pick whichever looks better and note the choice in the report. Confirm the resulting grid still reads correctly with an odd number of visible modules (since `visibleModules` is filtered by RBAC per user via `allowedModules`, the count isn't fixed) — a `lg:grid-cols-3` with, say, 4 or 5 visible modules will naturally leave a partial last row, which is expected and fine, just confirm it doesn't look broken.

---

## Phase 4 — SME/underwriting pages: make all Badge/pill text always white

The shared `Badge` component (`src/components/ui/badge.tsx`) has a sound base set of variants, but call sites across the app override `className` with light background colors while keeping colored (non-white) text, which is the likely source of the readability complaint — e.g. in `src/app/(app)/underwriting/medical-pricing/page.tsx`: `bg-emerald-100 text-emerald-700` (line ~996), `bg-primary/10 text-indigo-700` (line ~1130), `bg-teal-50 text-teal-700` (line ~1135), `bg-slate-100` with default (dark) text (multiple lines), and similar patterns likely repeated on other pages using colored status/category pills (census, endorsements, claims — search for `<Badge` usage broadly, don't limit the fix to just the underwriting page). For every Badge/pill instance that carries a custom background color, add/ensure `text-white` in its className instead of the current colored-text variant, and darken the background color slightly if needed for contrast (e.g. `bg-emerald-100` → `bg-emerald-500` or similar) so white text stays readable against it rather than just slapping `text-white` on a pale background where it'd disappear. Keep the underlying color-coding semantics (green = valid/success, red = invalid/destructive, etc.) — only the text color and, where needed for contrast, the background shade should change. Report every file and Badge instance touched, since "SME Medical Hub" wasn't found as a literally-named page in the codebase — confirm with whoever asked for this whether they mean the underwriting/medical-pricing page (labeled "Underwriting Platform" in the UI) or a different page, and in the meantime apply the fix everywhere Badges with colored backgrounds appear so the fix isn't accidentally scoped too narrowly.

---

## Reporting format

After each phase: what changed, which files, and for Phase 1 specifically the full file-by-file table described above. Flag anything found while working that isn't on this list. Phase 1 should be done cautiously and reported in detail before anything gets permanently removed — when in doubt, archive rather than delete.
