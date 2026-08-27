# Endorsement Hub – Functional Requirements & Validation Rules

Please implement the following changes in the **Endorsement Hub**:

### 1. Endorsement Reference Number
- When the user clicks on any endorsement card, the system must display the **Reference Number** associated with that endorsement.
- The reference number should be clearly visible within the endorsement details.

### 2. “Match via Sheet” – Cancellation Endorsement
- The **“Match via Sheet”** option/tab must **not appear** for **Cancellation Endorsements**.
- It should remain available only for endorsement types where member matching is required.

### 3. “Match via Sheet” – Required Columns
The **Match via Sheet** functionality must accept/display **only the following 5 columns**, in exactly this order:

1. National ID
2. Staff ID
3. Insured ID
4. Principal ID
5. Individual ID

No additional columns should be included or required.

### 4. Date Validation – Main System vs. Client Portal
- On the **Client Portal**, users cannot add or delete a member with a date earlier than today's date.
- However, users on the **Main System** should be able to modify the endorsement/addition date, including selecting a date prior to today's date.
- This restriction should therefore apply **only to the Client Portal** and should not prevent authorized Main System users from modifying the date.

### 5. Additions Endorsement – Approval Workflow
For **Additions Endorsements**, the user must not be able to access/click **“Approve & Invoice”** unless they have completed **“Verify & Approve”** first.

The system must enforce the following sequence:

**Verify & Approve → Complete Missing Data → Approve & Invoice**

Before allowing **Approve & Invoice**, the system must verify that:

- The **Verify & Approve** step has been completed.
- The following required IDs are available:
  - Insured ID
  - Principal ID
  - Individual ID

The IDs can be completed either by:
- Manually entering the required data, **or**
- Using the **Match via Sheet** functionality.

If any of the required IDs are still missing, the **Approve & Invoice** action must remain disabled/inaccessible.

### 6. Downloaded Excel File – Standard Format
The Excel file downloaded from **any endorsement** must contain **only** the following columns, in exactly this order:

| # | Column |
|---|---|
| 1 | Serial |
| 2 | Addition Date |
| 3 | Member Name |
| 4 | First Name |
| 5 | Second Name |
| 6 | Last Name |
| 7 | DOB |
| 8 | Gender |
| 9 | Relation |
| 10 | Staff ID |
| 11 | Plan Category |
| 12 | Principal ID |
| 13 | Mobile |
| 14 | Company Name |
| 15 | National ID |
| 16 | Nationality |
| 17 | Bank Name |
| 18 | Bank Account |
| 19 | IBAN |

No additional columns should be included in the downloaded Excel file.

### Acceptance Criteria
- All endorsement cards display their correct Reference Number when opened.
- “Match via Sheet” is completely hidden/disabled for Cancellation Endorsements.
- Match via Sheet contains exactly 5 supported columns.
- Main System users can modify dates to previous dates, while the Client Portal restriction remains unchanged.
- “Approve & Invoice” cannot be accessed before “Verify & Approve” is completed.
- “Approve & Invoice” cannot proceed while Insured ID, Principal ID, or Individual ID is missing.
- The downloaded Excel file contains exactly 19 columns in the specified order.
- Existing functionality for other endorsement types must not be negatively affected.

### Supabase / SQL
If any **Supabase database changes, SQL queries, migrations, triggers, functions, RLS policies, or schema updates** are required to implement the above requirements, please provide the required SQL scripts separately before applying any database-related changes.