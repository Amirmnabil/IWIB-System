# System-Wide Terminology & Functional Enhancements

Please implement the following changes across the entire system, including the Client Portal, Main System, database fields, UI labels, exports, notifications, and related workflows.

## 1. System-Wide Terminology Standardization

Apply the following terminology consistently throughout the entire system:

| Current Term | Replace With |
|---|---|
| Staff Code | **Staff ID** |
| Insurer Member ID | **Insurer ID** |
| Insured ID | **Insurer ID** |
| TPA ID Code | **Individual ID** |
| Principle Employee ID | **Principal ID** |
| Member | **Beneficiary** |

The new terminology must be applied consistently across:
- UI labels
- Forms
- Pop-ups
- Tables
- Filters
- Search fields
- Exported files
- Reports
- Notifications
- Endorsements
- Database-related display fields

---

# 2. Client Portal Enhancements

## A. Request Status Tracking – Advanced Filter

On the **Request Status Tracking** page, add an **Advanced Filter** functionality.

The filter should allow users to easily search and narrow down requests based on the available request and beneficiary information, including where applicable:
- Reference Number
- Beneficiary Name
- National ID
- Staff ID
- Insurer ID
- Principal ID
- Individual ID
- Request Type
- Status
- Submission Date
- Approval/Rejection Date

The filter should work without requiring a full-page refresh.

---

## B. Completed Endorsement – Detailed Pop-Up

When the user opens/clicks a **Completed Endorsement**, display the following information in the pop-up:

1. Beneficiary Name
2. National ID
3. Staff ID
4. Insurer ID
5. Principal ID
6. Individual ID
7. Status

The information should be displayed in a clear and logical order.

---

## C. Beneficiary Data Synchronization

There is currently an issue where newly added Beneficiaries appear in the **Beneficiaries List**, but their newly added/updated data from the **Policy Admin** does not synchronize correctly.

Please fix the synchronization logic so that:

- Any new Beneficiary added by the Policy Admin is correctly synchronized to the Client Portal.
- Any updated Beneficiary information is reflected correctly.
- The Client Portal always displays the latest approved data.
- No manual refresh should be required to retrieve synchronized data.

---

## D. Beneficiaries Export

On the **Beneficiaries Page**, the exported Excel/CSV sheet must include **all available Beneficiary details**.

The columns must be arranged in a logical business order, starting with the primary identification information and followed by employment, insurance, family, and status-related information.

Ensure that:
- No important Beneficiary fields are missing.
- Column names use the new standardized terminology.
- The exported data matches the latest synchronized data in the system.

---

## E. Endorsement Reference Number

When the user clicks any endorsement card, display the **Reference Number** generated/assigned when the endorsement was submitted/approved.

The reference number must be clearly visible within the endorsement details.

---

## F. Adding Spouse or Child

When adding a **Spouse or Child**, either from the **Client Portal** or the **Main System**:

### Primary Employee Search

The Primary Employee must be selectable using the search functionality based on:

- National ID
- Name

The search results should clearly identify the correct employee before selection.

### Multiple Children in One Request

Add an option allowing the user to add **more than one child within the same request**.

The user should be able to:

1. Select the Primary Employee.
2. Select the relationship as Child.
3. Enter the required details for Child 1.
4. Add another child using an **"Add Child"** option.
5. Continue adding additional children as required.
6. Submit all children as part of the same request/endorsement.

The system should validate each child individually while maintaining them under the same request.

---

## G. Beneficiary – Related Family Details

When the user clicks any Beneficiary, the **side detailed view** must display the Beneficiary's related family members, if any.

For each related family member, display:

- Full Name
- National ID
- Relationship
- Staff ID
- Insurer ID
- Principal ID
- Individual ID

The relationship between the selected Beneficiary and their family members must be clearly identifiable.

If no related family members exist, display an appropriate message such as:

**"No related family members found."**

---

## H. Approval & Rejection Notifications

Activate the notification functionality for all relevant **Add-on / Beneficiary requests**.

A notification must automatically be triggered when a request is:

- Approved
- Rejected

The notification should contain, where applicable:

- Beneficiary Name
- Request Type
- Reference Number
- Request Status
- Approval/Rejection Date
- Rejection reason, if applicable

The notification must be triggered automatically based on the final action without requiring the user to refresh the Client Portal.

---

# 3. Client Portal Real-Time Synchronization

Fix the current issue where users must manually refresh the Client Portal to see newly added or updated data.

The Client Portal should automatically synchronize and display the latest approved data after:

- Beneficiary addition
- Beneficiary update
- Beneficiary cancellation
- Endorsement approval
- Endorsement rejection
- Policy Admin updates
- Any other relevant transaction affecting Client Portal data

Implement the appropriate real-time synchronization, cache invalidation, state refresh, or database subscription mechanism required by the current architecture.

The objective is:

**User action → System processing → Database update → Client Portal automatically reflects the latest status/data**

No manual browser refresh should be required.

---

# 4. Supabase / SQL Requirements

Please provide and implement the required **Supabase SQL scripts** for all database changes required to support the above functionality.

The SQL should cover, where applicable:

- Required table modifications
- New/updated columns
- Relationships between Beneficiary and related family members
- Reference Number handling
- Request/endorsement status
- Notification triggers
- Real-time synchronization
- Required indexes for advanced filtering and search
- Row Level Security (RLS) policies
- Database functions/triggers
- Any required views
- Any required foreign keys or constraints

Please ensure that the SQL is compatible with the existing Supabase database structure and does **not break existing production functionality**.

Before applying destructive changes such as dropping or renaming database columns, verify dependencies and use a safe migration approach.

## Expected Deliverables

1. Updated terminology across the entire system.
2. Advanced filtering on Request Status Tracking.
3. Enhanced Completed Endorsement pop-up.
4. Correct Policy Admin → Client Portal synchronization.
5. Complete and logically ordered Beneficiary export.
6. Endorsement Reference Number displayed.
7. Improved spouse/child addition workflow.
8. Multiple children supported within one request.
9. Related family displayed in Beneficiary details.
10. Automatic approval/rejection notifications.
11. Elimination of the need for manual Client Portal refresh.
12. Complete Supabase SQL migration/scripts required to support all changes.
13. Ensure all changes are tested across both the **Client Portal and Main System** before deployment.