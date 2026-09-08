# IWIB System — Policy, Endorsement & Census Developer Guide for Claude Cowork

This document serves as an exhaustive reference guide for AI assistants (Claude, Claude Code, Cursor, Antigravity) working on the **Policy**, **Endorsement**, and **Census** core modules within the IWIB (BrokerView) System codebase.

---

## 1. System Overview & Architecture

The IWIB System manages insurance brokerage operations. The **Policy**, **Endorsement**, and **Census** modules are deeply interconnected:

```
                          ┌──────────────────────────┐
                          │     Client / Company     │
                          └────────────┬─────────────┘
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │          Policy          │
                          │  (Terms, Value, Insurer) │
                          └──────┬────────────┬──────┘
                                 │            │
         ┌───────────────────────┘            └───────────────────────┐
         ▼                                                            ▼
┌──────────────────────────┐                               ┌──────────────────────────┐
│      Census / Members    │ ◄───────────────────────────► │       Endorsements       │
│  (Roster, Family Links)  │      Updates Roster &         │  (Add, Delete, Change,   │
└──────────────────────────┘      Effective Dates          │   Proration & Invoicing) │
                                                           └──────────────────────────┘
```

- **Policy**: Represents the overarching insurance contract between a Client Company and an Insurer/TPA. Includes financial terms, commission agreements, installment schedules, tax settings, and document links.
- **Census / Policy Members**: The roster of covered individuals (Principals and Dependents). Tracks demographics, National IDs, TPA/Insurer IDs, addition/deletion dates, and family relationships.
- **Endorsement**: Modifications to an active policy (member additions, member deletions, plan changes, financial adjustments). Uses an insurer-configured endorsement rules engine to calculate prorated premiums, minimum threshold penalties, and invoice financial movements.

---

## 2. Directory & File Layout

### 📁 Policy Module Files
- **Pages**:
  - [`src/app/(app)/policies/page.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/(app)/policies/page.tsx): Main Policies List with search, status filters, LOB filtering, and metric aggregations.
  - [`src/app/(app)/policies/[id]/page.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/(app)/policies/%5Bid%5D/page.tsx): Policy Detail view, including overview, members list, commission agreements, installment schedules, and endorsement links.
- **Services & Helpers**:
  - [`src/services/policy.service.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/services/policy.service.ts): Data fetching, CRUD operations, policy member management, commission calculations.
- **Components**:
  - [`src/components/policies/PolicyUpload.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/components/policies/PolicyUpload.tsx): Policy contract & document parser and upload component.
  - [`src/components/policies/installments-manager.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/components/policies/installments-manager.tsx): Premium installment schedule manager & financial movement netting.
  - [`src/components/policies/policy-commission-agreements.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/components/policies/policy-commission-agreements.tsx): Brokerage commission structures (Essential, Motivational, Supplementary, Volume).
  - [`src/components/policies/broker-commission-sharing.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/components/policies/broker-commission-sharing.tsx): Agent/Producer commission split manager.

### 📁 Endorsement Module Files
- **Documentation & Specifications**:
  - [`Insurance_Endorsement_Taxonomy_Bilingual.md`](file:///d:/IWIB/IWIB%20System/SYSTEM/Insurance_Endorsement_Taxonomy_Bilingual.md): Complete taxonomy of endorsement types in English & Arabic.
  - [`endorsement_hub_requirements.md`](file:///d:/IWIB/IWIB%20System/SYSTEM/endorsement_hub_requirements.md): System requirements for the Endorsement Hub.
- **Pages**:
  - [`src/app/(app)/endorsements/page.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/(app)/endorsements/page.tsx): Endorsement Hub dashboard, tracking active/pending/approved endorsements.
  - [`src/app/(app)/endorsements/[id]/page.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/(app)/endorsements/%5Bid%5D/page.tsx): Endorsement Detail view with billing summary, affected member lists, and invoice breakdown.
  - [`src/app/(app)/endorsements/create/page.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/(app)/endorsements/create/page.tsx): Entry point for creating new endorsements.
- **Components & Wizard**:
  - [`src/components/endorsements/create-endorsement-wizard.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/components/endorsements/create-endorsement-wizard.tsx): Multi-step wizard supporting member addition, deletion, tier change, and bulk Excel import.
  - [`src/components/endorsements/EndorsementDetails.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/components/endorsements/EndorsementDetails.tsx): Component for rendering endorsement summaries and printing statement documents.
- **Business Logic & API Routes**:
  - [`src/lib/endorsement-rules.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/lib/endorsement-rules.ts): Core calculation logic for daily/monthly proration, late addition thresholds, and refund eligibility.
  - [`src/lib/endorsement-validation.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/lib/endorsement-validation.ts): Validation checks for endorsement rules before processing.
  - [`src/app/api/endorsements/bulk-upload/route.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/api/endorsements/bulk-upload/route.ts): API endpoint for processing bulk endorsement member files.
  - [`src/app/api/endorsements/classify/route.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/api/endorsements/classify/route.ts): AI classification of endorsement documents/requests.
  - [`src/app/api/endorsements/invoice/route.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/api/endorsements/invoice/route.ts): Invoice generation and financial movement posting for endorsements.

### 📁 Census Module Files
- **Pages**:
  - [`src/app/(app)/census/page.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/(app)/census/page.tsx): Internal Broker Census Directory across all policies & clients.
  - [`src/app/(app)/client/census/page.tsx`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/app/(app)/client/census/page.tsx): Client Portal interface for viewing & requesting census updates.
- **Services & Helpers**:
  - [`src/lib/census-excel-helper.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/lib/census-excel-helper.ts): Excel template reader/writer (30-column header standard), serial date parser `excelDateToISOString`, and member row mapping.

---

## 3. Schemas & TypeScript Definitions

### Policy Interface (`src/lib/types.ts`)
```typescript
export interface Policy {
  id: string;
  policy_number: string;
  insurer_policy_number?: string;
  client_company_id: string;
  client_company_name: string;
  insurer_id: string;
  insurer_name: string;
  tpa_id?: string;
  tpa_name?: string;
  line_of_business_id?: string;
  product_subtype_id?: string;
  client_type_id?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  premium_total: number;
  premium_gross?: number;
  contract_net?: number;
  tax_amount?: number;
  tax_type?: 'percentage' | 'amount';
  tpa_fee?: number;
  fee_percent?: number;
  broker_commission_percent?: number;
  taxes_percent?: number;
  policy_status: string; // active, expired, cancelled, pending
  member_count?: number;
  created_at: string;
}
```

### Policy Member Interface (`src/lib/types.ts`)
```typescript
export interface PolicyMember {
  id: string;
  policy_id: string;
  member_name: string;
  full_name_arabic?: string;
  member_id_tpa?: string;
  member_id_insurance?: string;
  staff_code?: string;
  date_of_birth?: string;
  gender: 'Male' | 'Female';
  relation: 'Principal' | 'Spouse' | 'Child';
  principle_id?: string; // Links dependent to Principal
  nationality?: string;
  national_id?: string;
  plan_category?: string;
  location?: string;
  department?: string;
  job_title?: string;
  addition_date?: string;
  deletion_date?: string;
  mobile_number?: string;
  marital_status?: string;
  bank_name?: string;
  bank_account?: string;
  iban?: string;
  notes?: string;
  created_at: string;
}
```

### Insurer Endorsement Rules Interface (`src/lib/endorsement-rules.ts`)
```typescript
export interface InsurerEndorsementRules {
  id?: string;
  insurer_id?: string;
  proration_method?: 'daily' | 'monthly' | null;
  late_addition_threshold_month?: number | null; // e.g., 9 months into policy
  minimum_premium_percentage_after_threshold?: number | null; // e.g., 25% minimum charge
  refund_allowed_if_utilized?: boolean | null;
  refund_processing_delay_days?: number | null;
  dependent_termination_on_main_delete?: boolean | null;
  coverage_start_basis?: 'request_date' | 'effective_date' | null;
  refund_proration_method?: 'daily' | 'monthly' | null;
}
```

---

## 4. Key Business Logic & Calculation Rules

### A. Endorsement Proration Logic (`src/lib/endorsement-rules.ts`)
1. **Daily Proration**:
   - `proration_factor = remaining_days / total_policy_days`
   - `remaining_days = max(0, difference_in_days(effective_date, policy_end_date))`
2. **Monthly Proration**:
   - `proration_factor = remaining_months / 12`
3. **Late Addition Threshold Rule**:
   - If an addition occurs after `late_addition_threshold_month` (e.g. Month 10 of a 12-month policy), check `minimum_premium_percentage_after_threshold`.
   - If `calculated_proration < minimum_percentage`, override `proration_factor` with `minimum_percentage`.
4. **Dependent Auto-Deletion**:
   - When deleting a Principal member, if `dependent_termination_on_main_delete` is enabled, all linked dependents (where `principle_id == main_member_id`) are automatically queued for deletion as of the same effective date.

### B. Census Excel Import & Column Standard (`src/lib/census-excel-helper.ts`)
The standard 30-column header used across Excel import and export operations:
```
1. Contract NO.           11. Full Name English   21. Mobile NO.
2. Policy NO.             12. Full Name Arabic    22. Marital Status
3. Company Name           13. Insurer ID          23. Nationality
4. Insurer Name           14. Staff ID            24. National ID
5. TPA Name               15. Individual ID       25. Location
6. Effective Date         16. Principal ID        26. Department
7. Expiration Date        17. DOB                 27. Job Title
8. Addition Date          18. Gender              28. Bank Name
9. Deletion Date          19. Relation            29. Bank Account / IBAN
10. PLAN                  20. Notes               30. Notes
```
- **Date Parser**: `excelDateToISOString(val)` converts JS Date objects, Excel numeric serials (e.g. `45123`), and date strings to standardized `YYYY-MM-DD`.

### C. Database Migration Highlights (`supabase/migrations/`)
- `20260812000200_add_users_policy_id.sql`: Links client portal users directly to active policies.
- `20260812000300_unified_endorsements_schema.sql`: Core schema for `endorsements` table and type categories.
- `20260815000000_insurer_endorsement_rules.sql`: Rules table per insurer for automated proration calculations.
- `20260825120000_seed_taxonomy_endorsements.sql`: Seed data for standard endorsement types.
- `20260901000000_fix_policy_members_and_sync.sql`: Synchronization logic between `census_members` and `policy_members`.
- `20260905000000_link_family_dependents.sql`: Establishes foreign keys and hierarchy between Principal members and Dependents.

---

## 5. Development Guidelines for Claude / AI Agents

When implementing changes or extending these modules:

1. **Proration Integrity**: Always use helper functions from `src/lib/endorsement-rules.ts` when computing financial impacts of member additions/deletions. Never hardcode date difference math in components.
2. **Family Grouping**: When modifying census rows or deleting members, check whether the member is a `Principal`. If so, ensure linked dependents (`principle_id`) are properly updated or flagged.
3. **Multilingual Consistency**: Ensure all UI labels reference standard i18n dictionaries:
   - English: [`src/lib/i18n/en/insurance.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/lib/i18n/en/insurance.ts)
   - Arabic: [`src/lib/i18n/ar/insurance.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/lib/i18n/ar/insurance.ts)
4. **Excel Compatibility**: When adding or parsing columns in census files, maintain full compatibility with [`CENSUS_HEADERS`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/lib/census-excel-helper.ts#L3-L34) in `src/lib/census-excel-helper.ts`.
5. **Database Types**: Always update [`src/lib/types.ts`](file:///d:/IWIB/IWIB%20System/SYSTEM/src/lib/types.ts) whenever table structures in Supabase migrations change.
