# Prompt for Antigravity: Fix Remaining IWIB Audit Findings (Round 3)

Paste everything below into Antigravity as the task instruction. This follows a third audit pass that confirmed all previously-critical items are now fixed — including the auth gap that took two cycles to close. Nothing left is critical-severity; this is cleanup and two bugs that got carried forward inside the last rewrite. Don't touch anything not listed here.

---

## Context

Round 2 shipped a strong fix: all three endorsement API routes are now authenticated, the netting RPC names were corrected, and the full endorsement-invoicing flow was consolidated into a single atomic, row-locked Postgres function (`process_endorsement_invoicing`), which also closed the double-invoice race condition. The utilization-matching logic was rewritten with a three-tier confidence model and a `needs_review` flag, and `census_members` is now trigger-synced from `policy_members` instead of being independently maintained. Client-portal RLS scoping was added via new `get_auth_user_company_id()`/`get_auth_user_policy_id()`/`get_auth_user_role()` helpers.

**Confirmed working — do not touch unless you find a regression while investigating something else:**
- Auth on `src/app/api/endorsements/invoice/route.ts`, `classify/route.ts`, `bulk-upload/route.ts`.
- The `process_endorsement_invoicing` RPC's transaction/locking structure.
- The `net_installments`/`reverse_installment_netting` RPC calls in `installment.service.ts`.
- The utilization confidence-matching logic and `needs_review` flag.
- The `sync_policy_member_to_census` trigger.

**What's left, in priority order:**

Same ground rules as prior rounds: no destructive SQL against live data, new migrations only (timestamp later than the newest existing one), verify current DB state before altering anything, comment or test every fix, run `npm run typecheck` and `npm run lint` after each phase, report before moving on. Two of the items below (3.1, 3.2) are things that got carried forward *inside* the Round 2 rewrite rather than being pre-existing untouched bugs — mention explicitly in your report that you found and fixed them there, since it's useful signal for the team that a structural rewrite can silently preserve issues that weren't on its specific task list.

---

## Phase 1 — Two bugs carried forward by the last rewrite (do these first, both are small)

### 1.1 Fix the hardcoded 'MEDICAL' line-of-business lookup
File: the `process_endorsement_invoicing` function, defined in `supabase/migrations/20260828000000_recreate_financial_movements.sql` (and possibly re-defined again in a later migration — check `20260829000000_scope_client_portal_rls.sql`, which also contains a `CREATE OR REPLACE FUNCTION public.process_endorsement_invoicing`, and confirm which version is actually live). The financial-movement linkage step does:
```sql
SELECT id INTO v_lob_ref_id FROM public.reference_list WHERE category = 'line_of_business' AND key = 'MEDICAL';
```
regardless of the policy's actual line of business. This originated in the old `api/endorsements/invoice/route.ts` (already flagged in the original audit) and was carried into the SQL RPC verbatim during the Round 2 refactor. Fix: pass the policy's actual line-of-business/policy-type into the RPC as a parameter (the calling route already has `policy.line_of_business`/`policy.policy_type` available), map it to the correct `reference_list` key (`MEDICAL`/`MOTOR`/`LIFE`/`PROPERTY`/`MARINE` — all already seeded), and use that instead of the hardcoded literal. Write a new migration with `CREATE OR REPLACE FUNCTION` rather than editing the existing migration files.

### 1.2 Tighten RLS on the recreated financial-movement tables
File: new migration needed (the tables were created in `20260828000000_recreate_financial_movements.sql`, do not edit that file — add a new one). `policy_financial_movements` and `invoice_financial_movements` currently have:
```sql
CREATE POLICY "Enable all access for authenticated users on policy_financial_movements" 
ON public.policy_financial_movements FOR ALL USING (auth.role() = 'authenticated');
```
— any authenticated user can read/write any policy's financial movements. Every other financially-sensitive table (`policies`, `invoices`, `commissions`, `claims`) was already tightened in the July `20260726000000_tighten_rls_policies.sql`/`20260726000001_secure_remaining_tables.sql` migrations to `public.is_admin_or_manager() OR <policy/company ownership check>`. Drop the wide-open policies on both tables and replace them with the same pattern, scoped through `policy_financial_movements.policy_id` (and through the linked `invoice_financial_movements.invoice_id` → `invoices.policy_id` for the second table) — mirror the exact structure already used for `claims`/`commissions` in the July migrations rather than inventing a new shape. Verify against `pg_policies` afterward that the new policies are actually active and the old ones are gone.

---

## Phase 2 — Decisions needed before more production data accumulates

### 2.1 Banking PII protection for bank_account/iban
`policy_members` and `census_members` both store `bank_name`, `bank_account`, `iban` as plain `text`, propagated automatically between the two by the sync trigger. This has been flagged at two consecutive audits with no action. Do not silently pick an approach — present the tradeoffs and implement whichever the team confirms:
- **Option A (minimum viable):** mask in every UI list/table view (show only last 4 digits of `bank_account`/`iban`, full value visible only behind an explicit "reveal" action, logged as an audit event when revealed). No schema change required.
- **Option B (stronger):** encrypt `bank_account`/`iban` at rest using `pgsodium` or application-level encryption before write, decrypt only in the specific server-side context that needs the full value (e.g., generating a payment file). Requires a migration and changes everywhere these columns are read or written — larger scope.
- Implement Option A now regardless of what's decided about Option B, since it's cheap and directly closes the most visible risk (anyone with ordinary census view access seeing full bank details in a list). Flag Option B as a decision for the team rather than implementing it without confirmation, since it changes how every consumer of these columns needs to read them.

### 2.2 Verify claims and policy_members RLS under a real client-portal login
The last audit could not confirm from static code alone whether `claims` and `policy_members` are properly scoped for the `Client` role — `policy_members` likely inherits correct scoping transitively through its existing `policy_id IN (SELECT id FROM public.policies)` policy (since `policies` itself is now client-scoped), and `claims` has no client-portal-specific policy at all (the client portal doesn't appear to display claims based on the pages sampled, so this may be a non-issue, but confirm rather than assume). Create a test `Client`-role user scoped to one company/policy, log in as them (or exercise the relevant queries with their JWT), and confirm: (a) they can see their own policy's `policy_members` and cannot see another company's, (b) if any client-portal-visible page ever queries `claims`, confirm it's properly scoped or add a policy if it's currently relying on nothing. Report findings either way — "confirmed correctly scoped" is a valid, useful outcome here, not just "found and fixed a gap."

---

## Phase 3 — Low-priority cleanup, carried over from Round 1, still not started

- Replace `Math.random()`-based invoice/endorsement numbering (`invoice/route.ts`, `bulk-upload/route.ts`) with a Postgres sequence or `gen_random_uuid()`-derived code plus a real `UNIQUE` constraint and collision handling.
- Move repo-root debug artifacts (`errors.txt`, `missing_out.txt`, `missing_translations.txt`, `tsc_output.txt`, `build_output.log`) out of the tracked repo and into `.gitignore`.
- Regenerate or retire `schema.sql`, `RLS.md`, `table_name column_name.md` — still stale relative to the live migration history across three audit rounds now.
- Add a `test` script and CI workflow (typecheck + lint + test + migration-replay against a scratch database) — still doesn't exist, and would have caught both Phase 1 items above automatically if it diffed the RPC/RLS state against a checklist.
- Upgrade or replace the `xlsx@0.18.5` dependency, now used server-side inside authenticated-but-still-exposed routes that parse fetched files.
- Continue the calculation consolidation already underway in `invoiceUtils.ts` (it's now pulling `calculatePolicyTotalTax`/`calculateCommissionAdjustedNet`/`calculateInsurerCommissionTaxes` from `endorsement-rules.ts` — good, keep going until there's no duplicate proration/tax/commission logic left anywhere).
- Make the explicit multi-tenancy decision (single-broker internal tool vs. future resellable SaaS) — still undecided, still worth resolving before more tables/UI accumulate assuming an implicit single tenant.

---

## Reporting format

After each phase: what changed, which files/migrations, why, and what needs a human decision (Option A vs. B in 2.1 specifically — implement A, present B, don't guess). For 2.2, report the verification outcome even if nothing needed fixing. Flag anything found while working that isn't on this list. Phase 1 is small enough to ship in one sitting; Phase 2.1's Option A should ship alongside it.
