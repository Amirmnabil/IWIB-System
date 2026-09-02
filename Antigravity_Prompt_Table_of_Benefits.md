\---

## ROLE \& CONTEXT

You are implementing the **Table of Benefits** module inside Benefit Schedules Page. This module defines the medical insurance benefit structure that Plan Tiers are built from, and it must plug into the existing platform conventions (bilingual UI, Supabase as source of truth, Google Drive as document layer where relevant).

Do not treat this as a standalone feature — it must be wired into the existing schema, auth/RLS model, and navigation of the current codebase. Inspect the existing project structure, naming conventions, and component patterns before generating new files, and follow them exactly.

When User creating a policy or make addition for a member, the plan must trigger from the Benefit Schedules page plan created 

\---

## 1\) BILINGUAL REQUIREMENT (AR / EN)

The entire module must be fully bilingual, with language driven by **page context**, not a single global toggle:

* Every page/screen has a defined language mode:

  * **Client-facing / proposal-facing pages** (e.g. printable Table of Benefits, client portal views) → default **Arabic, RTL**, with an explicit switch to English (LTR) available.
  * **Internal admin / configuration pages** (Master Data, benefit builder, plan tier config) → support both, with the same switch pattern already used elsewhere in the platform — reuse the existing i18n mechanism if one exists in the codebase; do not invent a second one.
* All user-facing strings (labels, benefit names, category names, tooltips, validation messages, exported documents) must have **both** an `\_ar` and `\_en` field wherever text is stored in the database — never hardcode a single-language string for anything that will render in the UI.
* RTL/LTR layout must switch correctly with the language, including tables, form field alignment, and PDF/print export.
* Benefit and category **names** are themselves bilingual data (not translation-file strings) because clients define custom benefit names — store `name\_ar` and `name\_en` as columns, not in a static translation file.
* Numbers, currency, and dates must format correctly for both locales (Arabic-Indic vs Western numerals — confirm existing platform convention and stay consistent with it).

\---

## 2\) DATABASE SCHEMA (SUPABASE)

Implement the following tables (adjust names only if they collide with existing conventions in the codebase — otherwise use as-is). Every table needs RLS policies consistent with the platform's existing RBAC model (reuse existing roles/policies; do not create a parallel auth system).

```sql
-- Reference/master data: benefit categories
create table benefit\_categories (
  id uuid primary key default gen\_random\_uuid(),
  name\_ar text not null,
  name\_en text not null,
  sort\_order int not null default 0,
  is\_active boolean not null default true,
  created\_at timestamptz not null default now()
);

-- Reference/master data: benefit definitions (the master catalogue of all possible benefits)
create table benefit\_definitions (
  id uuid primary key default gen\_random\_uuid(),
  category\_id uuid not null references benefit\_categories(id),
  parent\_benefit\_id uuid references benefit\_definitions(id), -- for sub-items (e.g. surgery sub-components)
  name\_ar text not null,
  name\_en text not null,
  description\_ar text,
  description\_en text,
  is\_active boolean not null default true,
  sort\_order int not null default 0,
  created\_at timestamptz not null default now()
);

-- Reference/master data: networks
create table medical\_networks (
  id uuid primary key default gen\_random\_uuid(),
  name\_ar text not null,
  name\_en text not null,
  is\_active boolean not null default true
);

-- Plan tiers (per client contract)
create table plan\_tiers (
  id uuid primary key default gen\_random\_uuid(),
  client\_id uuid not null references clients(id),
  tier\_name\_ar text not null,
  tier\_name\_en text not null,
  annual\_aggregate\_limit\_value numeric,
  annual\_aggregate\_limit\_currency text not null default 'EGP',
  regional\_scope text not null check (regional\_scope in ('local','regional','worldwide\_ex\_us','worldwide\_incl\_us')),
  network\_id uuid references medical\_networks(id),
  card\_type text not null check (card\_type in ('electronic','physical','both')),
  policy\_start\_date date,
  policy\_end\_date date,
  created\_at timestamptz not null default now()
);

-- Combined pools (shared limits across selected benefits)
create table combined\_pools (
  id uuid primary key default gen\_random\_uuid(),
  tier\_id uuid not null references plan\_tiers(id) on delete cascade,
  pool\_name\_ar text not null,
  pool\_name\_en text not null,
  pool\_limit\_value numeric not null,
  pool\_limit\_currency text not null default 'EGP',
  pool\_basis text not null check (pool\_basis in ('annual','per\_case')),
  depletion\_rule text not null default 'first\_come\_first\_served',
  created\_at timestamptz not null default now()
);

-- The core configuration table: one row per (tier x benefit)
create table plan\_benefit\_config (
  id uuid primary key default gen\_random\_uuid(),
  tier\_id uuid not null references plan\_tiers(id) on delete cascade,
  benefit\_id uuid not null references benefit\_definitions(id),
  coverage\_status text not null check (coverage\_status in ('covered','not\_covered','partially\_covered')),
  limit\_type text not null check (limit\_type in ('included\_in\_aal','sub\_limit','unlimited','per\_case')),
  limit\_value numeric,
  limit\_currency text default 'EGP',
  limit\_basis text check (limit\_basis in ('annual','per\_case','lifetime','per\_visit')),
  payment\_mechanism text not null check (payment\_mechanism in ('direct\_billing','reimbursement','both')),
  co\_payment\_percent numeric default 0,
  co\_payment\_cap numeric,
  deductible\_value numeric,
  network\_scope text not null check (network\_scope in ('in\_network\_only','in\_and\_out\_network')),
  waiting\_period\_days int default 0,
  pre\_existing\_condition\_covered text check (pre\_existing\_condition\_covered in ('yes','no','after\_waiting\_period')),
  requires\_pre\_authorization boolean default false,
  exclusions\_ar text,
  exclusions\_en text,
  combined\_pool\_id uuid references combined\_pools(id),
  doctor\_on\_site boolean default false,
  created\_at timestamptz not null default now(),
  updated\_at timestamptz not null default now(),
  unique (tier\_id, benefit\_id)
);

-- Out-of-network reimbursement rules (per benefit config row)
create table oon\_reimbursement\_rules (
  id uuid primary key default gen\_random\_uuid(),
  plan\_benefit\_config\_id uuid not null references plan\_benefit\_config(id) on delete cascade,
  reimbursement\_basis text not null check (reimbursement\_basis in ('actual\_invoice\_percent','reference\_tariff\_percent')),
  reimbursement\_percent numeric not null,
  reimbursement\_cap numeric,
  required\_documents\_ar text,
  required\_documents\_en text,
  claim\_submission\_window\_days int default 30
);

-- Doctor on-site configuration
create table doctor\_on\_site\_config (
  id uuid primary key default gen\_random\_uuid(),
  tier\_id uuid not null references plan\_tiers(id) on delete cascade,
  location\_ar text,
  location\_en text,
  schedule\_ar text,
  schedule\_en text,
  scope\_of\_service text check (scope\_of\_service in ('general\_consultation','consultation\_plus\_basic\_meds','first\_aid')),
  cost\_model text check (cost\_model in ('fixed\_retainer','per\_visit')),
  linked\_benefit\_ids uuid\[] default '{}'
);
```

Add appropriate indexes on all foreign keys, and `updated\_at` triggers consistent with the rest of the platform.

\---

## 3\) MASTER DATA PAGE — "REFERENCE LISTS"

Everything above that is **reusable across clients** must live inside a dedicated **Reference Lists** section under the existing **Master Data** page (or create this page if it does not already exist, following the platform's existing settings/admin page pattern). This is not optional scaffolding — it is the single source of truth all Plan Tiers pull from.

The Reference Lists section must include CRUD screens (list + create/edit modal or page) for:

1. **Benefit Categories** — manage `benefit\_categories` (bilingual name, sort order, active/inactive)
2. **Benefit Definitions** — manage the master catalogue in `benefit\_definitions`, including parent/child relationships for sub-items (e.g. "Surgical Procedures" → "Operating Room", "Medications \& Supplies", "Nursing", "ICU Stay", "Consultant/Anesthesiologist Fees"). UI must support nesting (tree or indented list).
3. **Medical Networks** — manage `medical\_networks`
4. Any other lookup values used by dropdowns in the benefit config screen (e.g. currencies, regional scope options, room type options) — implement these as reference lists too rather than hardcoded enums in the frontend, unless they are truly fixed business rules (in which case keep them as DB `check` constraints as scaffolded above, but still surface bilingual labels for them from a small lookup table or i18n resource).

Rules for this section:

* Only authorized roles (reuse existing RBAC — likely admin/ops roles) can edit Reference Lists.
* Every reference list item requires both `name\_ar` and `name\_en` before it can be saved — validate this at the form level.
* Deleting an item that is in use by any `plan\_benefit\_config` or `plan\_tiers` row must be blocked or soft-deleted (`is\_active = false`), never hard-deleted, to preserve historical plan data integrity.
* Changes to Reference Lists must not retroactively alter already-configured plan tiers unless explicitly intended (i.e. `plan\_benefit\_config` stores its own values, it does not compute from the reference list at render time beyond the benefit's name/category).

\---

## 4\) BUILDER UI — PLAN TIER / BENEFIT CONFIGURATION SCREEN

Build the configuration screen where a tier's benefits are set up:

* Select or create a **Plan Tier**, set its tier-level fields (AAL, regional scope, network, card type).
* For each benefit pulled from `benefit\_definitions` (grouped by category, with sub-items nested under their parent), show an expandable row/card exposing every field in `plan\_benefit\_config`:

  * Coverage status, limit type, limit value/currency/basis, payment mechanism, co-payment %, co-payment cap, deductible, network scope, waiting period, pre-existing condition status, pre-authorization toggle, exclusions (bilingual), doctor-on-site toggle.
* **Combined Pools panel:** allow creating a pool (bilingual name, limit, currency, basis) and multi-selecting any benefits from the current tier to attach to it via `combined\_pool\_id`. Show pool consumption/allocation clearly. A benefit attached to a pool should visually indicate it inherits the pool's limit instead of its own.
* **Out-of-network reimbursement panel:** per benefit, when `network\_scope = in\_and\_out\_network`, expose the `oon\_reimbursement\_rules` fields (basis, percent, cap, required documents, submission window).
* **Doctor on-site panel:** tier-level toggle and config screen for `doctor\_on\_site\_config`, with the ability to link it to specific benefits (so those benefits' UI can note "supplemented by on-site doctor").
* Provide a **duplicate tier** action (clone an existing tier's full configuration into a new tier for fast editing) — this is a core workflow, not a nice-to-have.
* Autosave or clear save/validation state consistent with the rest of the platform's forms.

\---

## 5\) CLIENT-FACING OUTPUT

* Generate a **printable/exportable Table of Benefits view** per tier, laid out as a clean table (categories → benefits → sub-items indented), respecting the bilingual/RTL rule in Section 1 (Arabic by default for client-facing output, English on toggle).
* This should be exportable to PDF using the platform's existing export pipeline if one exists; otherwise implement a straightforward print-to-PDF view.
* Combined pools should render as a single shared-limit row/note spanning their member benefits, not duplicated per benefit.

\---

## 6\) VALIDATION \& DATA INTEGRITY

* `plan\_benefit\_config`: enforce (`tier\_id`, `benefit\_id`) uniqueness (already in schema) so a benefit cannot be configured twice for the same tier.
* If `limit\_type = 'sub\_limit'`, `limit\_value` is required.
* If `payment\_mechanism` includes reimbursement and `network\_scope = 'in\_and\_out\_network'`, prompt to configure `oon\_reimbursement\_rules` (not strictly required, but flag it in the UI as incomplete if missing).
* If a benefit is attached to a `combined\_pool\_id`, its own `limit\_value`/`limit\_type` should be disabled/ignored in the UI to avoid contradictory data entry.
* All monetary fields must respect the tier's default currency unless explicitly overridden per benefit.

\---

## 7\) DELIVERABLE CHECKLIST

* \[ ] Supabase migration files for all tables above, with RLS policies matching existing roles
* \[ ] Reference Lists section under Master Data (Benefit Categories, Benefit Definitions with nesting, Medical Networks, other lookups)
* \[ ] Plan Tier + Benefit Config builder screen with full per-benefit flexibility
* \[ ] Combined Pools creation + multi-select attachment UI
* \[ ] Out-of-network reimbursement configuration per benefit
* \[ ] Doctor On-Site configuration + linkage to benefits
* \[ ] Bilingual (AR/EN) support on every field and screen, RTL/LTR switching correctly by page context
* \[ ] Client-facing printable/exportable Table of Benefits view
* \[ ] Duplicate-tier workflow
* \[ ] Validation rules from Section 6 enforced at both form and DB level

Follow the existing codebase's file structure, component naming, and state-management conventions throughout. Ask for clarification only if something in this spec conflicts with an existing schema or pattern already in the project — otherwise proceed and implement.

