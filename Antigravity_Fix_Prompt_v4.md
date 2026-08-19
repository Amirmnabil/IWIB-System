# Prompt for Antigravity: Fix Remaining IWIB Audit Findings (Round 4)

Paste everything below into Antigravity as the task instruction. Four audit rounds in, everything critical and everything structurally risky is fixed. What's left is one overdue item that's been asked for twice, one small data-verification task, one live-login RLS test, and the long-standing low-priority cleanup list. There is no Phase 1 "fix this before anything else" this round — pick items in the order given, but none of them block the others.

---

## Context

Round 3 asked for two bugs that got carried forward inside an earlier rewrite (hardcoded line-of-business, wide-open RLS on the recreated financial-movement tables), plus a banking-PII masking decision and a client-portal RLS verification for `claims`/`policy_members`. Three of those four landed well: the line-of-business fix is correct end-to-end (new `p_lob_key` parameter on `process_endorsement_invoicing`, properly threaded from the calling route), the financial-movement RLS now mirrors the existing ownership-scoped pattern exactly, and the `claims` RLS check came back with a real gap found and fixed (`20260831000000_scope_claims_client_portal.sql`).

**Confirmed working — do not touch unless you find a regression while investigating something else:**
- Auth on all three endorsement API routes.
- The `process_endorsement_invoicing` RPC (now on its second signature, 15 parameters including `p_lob_key`) — its transaction/locking structure, member insert/delete/cascade logic, and financial-movement linkage are all correct.
- RLS on `policy_financial_movements`, `invoice_financial_movements`, and `claims`.
- The netting RPC calls, the utilization confidence-matching logic, and the `census_members` sync trigger.

**What's left:**

Same ground rules as every prior round: no destructive SQL against live data, new migrations only (timestamp later than the newest existing one), verify current DB state before altering anything, comment or test every fix, run `npm run typecheck` and `npm run lint` after each phase, report before moving on.

---

## Phase 1 — The overdue item (do this first, it's been asked for twice now)

### 1.1 Implement banking-PII masking (Option A from Round 3)
`policy_members` and `census_members` both store `bank_name`, `bank_account`, `iban` as plain text, kept in sync by the existing `sync_policy_member_to_census` trigger. This was flagged at Round 2, requested explicitly at Round 3 with a specific minimum-viable scope, and not started in either case. Implement it now:
- In every UI view that lists or displays `bank_account`/`iban` (census list/table views, member detail views — search the codebase for these column names to find every render site, don't assume you've found them all from memory), mask the value to show only the last 4 characters (e.g., `••••••••1234`), with a full-value reveal only behind an explicit user action (a "show" toggle or similar).
- Log a reveal as an audit event (`action: 'REVEAL_BANK_DETAILS'` or similar, via the existing `audit_logs` pattern) so there's a record of who looked at a full bank account number and when — this is the detail that makes masking actually meaningful for a regulated insurance broker rather than just cosmetic.
- No schema change is needed for this phase (that's Option B, still not being requested — don't implement encryption-at-rest without separate confirmation, since it changes how every consumer of these columns reads them).
- Report back every render site you masked, so it's possible to confirm none were missed.

---

## Phase 2 — Verification tasks (cheap, do these regardless of what Phase 1 turns up)

### 2.1 Confirm reference_list line-of-business keys match live policy_type values
The `process_endorsement_invoicing` RPC now correctly passes through the policy's actual line-of-business, but it does `UPPER(COALESCE(p_lob_key, v_lob, 'MEDICAL'))` against `reference_list` rows keyed as `MEDICAL`/`MOTOR`/`LIFE`/`PROPERTY`/`MARINE`. Query the live (or staging) database for the distinct values actually stored in `policies.policy_type` and `endorsements.line_of_business`. If any of them don't match one of those five codes exactly (case aside) — e.g. a longer descriptive string, an Arabic label, a different code convention — the financial-movement linkage step silently no-ops for that policy's endorsements (the invoice itself still gets created correctly; only the linkage record is skipped, with no error surfaced). If there's a mismatch, either normalize the stored values or add a mapping step in the RPC/route from whatever's actually stored to the `reference_list` key. Report what you found either way — "confirmed they match, no action needed" is a valid and useful outcome here, same as the `claims` RLS check was last round.

### 2.2 Test policy_members/census_members visibility under a real client-portal login
This has been carried forward as an inference (not a direct test) since Round 3: `policy_members` likely inherits correct client-portal scoping transitively through `policies` RLS, since its own policy already gates on `policy_id IN (SELECT id FROM public.policies)` and `policies` itself is now client-scoped. The `claims` table looked similarly "probably fine" before Round 3's check and turned out to have a real gap, so don't extend the same assumption to `policy_members`/`census_members` without actually testing it. Create or use a test `Client`-role user scoped to one `company_id`/`policy_id`, and confirm directly (via their JWT/session, not just by reading policy definitions) that they can see their own policy's members and census rows and cannot see another company's. If a gap is found, fix it following the same `get_auth_user_company_id()`/`get_auth_user_policy_id()` pattern already used on `companies`, `policies`, `census_members`, `invoices`, and `claims`. Report the outcome either way.

---

## Phase 3 — Low-priority cleanup, unchanged since Round 1, still not started

- Replace `Math.random()`-based invoice/endorsement numbering (`invoice/route.ts`, `bulk-upload/route.ts`) with a Postgres sequence or `gen_random_uuid()`-derived code plus a real `UNIQUE` constraint and collision handling.
- Move repo-root debug artifacts (`errors.txt`, `missing_out.txt`, `missing_translations.txt`, `tsc_output.txt`, `build_output.log`) out of the tracked repo and into `.gitignore`.
- Regenerate or retire `schema.sql`, `RLS.md`, `table_name column_name.md` — stale relative to the live migration history across four audit rounds now.
- Add a `test` script and CI workflow (typecheck + lint + test + migration-replay against a scratch database).
- Upgrade or replace the `xlsx@0.18.5` dependency.
- Continue the calculation consolidation already underway in `invoiceUtils.ts`/`endorsement-rules.ts` until no duplicate proration/tax/commission logic remains anywhere.
- Make the explicit multi-tenancy decision (single-broker internal tool vs. future resellable SaaS) — still undecided across all four rounds.

---

## Reporting format

After each phase: what changed, which files/migrations, why, and the outcome of both verification tasks in Phase 2 even if nothing needed fixing. For Phase 1, list every UI location where masking was added. Flag anything found while working that isn't on this list.
