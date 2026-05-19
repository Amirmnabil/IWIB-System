| table_name  | column_name              | data_type                | is_nullable |
| ----------- | ------------------------ | ------------------------ | ----------- |
| activities  | id                       | uuid                     | NO          |
| activities  | activity_type            | text                     | NO          |
| activities  | subject                  | text                     | NO          |
| activities  | description              | text                     | YES         |
| activities  | status                   | text                     | YES         |
| activities  | priority                 | text                     | YES         |
| activities  | due_date                 | timestamp with time zone | YES         |
| activities  | end_date                 | timestamp with time zone | YES         |
| activities  | related_type             | text                     | YES         |
| activities  | related_id               | uuid                     | YES         |
| activities  | related_name             | text                     | YES         |
| activities  | assigned_to_id           | uuid                     | YES         |
| activities  | result                   | text                     | YES         |
| activities  | duration_minutes         | integer                  | YES         |
| activities  | created_at               | timestamp with time zone | YES         |
| activities  | assigned_to_name         | text                     | YES         |
| audit_logs  | id                       | uuid                     | NO          |
| audit_logs  | user_id                  | text                     | YES         |
| audit_logs  | user_name                | text                     | YES         |
| audit_logs  | action                   | text                     | NO          |
| audit_logs  | resource_type            | text                     | NO          |
| audit_logs  | resource_id              | text                     | YES         |
| audit_logs  | resource_name            | text                     | YES         |
| audit_logs  | changes                  | jsonb                    | YES         |
| audit_logs  | created_at               | timestamp with time zone | NO          |
| claims      | id                       | uuid                     | NO          |
| claims      | claim_number             | text                     | YES         |
| claims      | policy_id                | uuid                     | YES         |
| claims      | member_id                | uuid                     | YES         |
| claims      | member_name              | text                     | YES         |
| claims      | claim_type               | text                     | YES         |
| claims      | incident_date            | date                     | YES         |
| claims      | submission_date          | date                     | YES         |
| claims      | claim_amount             | numeric                  | YES         |
| claims      | status                   | text                     | YES         |
| claims      | created_at               | timestamp with time zone | YES         |
| commissions | id                       | uuid                     | NO          |
| commissions | policy_id                | uuid                     | YES         |
| commissions | commission_rate          | numeric                  | YES         |
| commissions | premium_amount           | numeric                  | YES         |
| commissions | expected_commission      | numeric                  | YES         |
| commissions | paid_commission          | numeric                  | YES         |
| commissions | commission_status        | text                     | YES         |
| commissions | payment_date             | date                     | YES         |
| commissions | created_at               | timestamp with time zone | YES         |
| companies   | id                       | uuid                     | NO          |
| companies   | code                     | text                     | YES         |
| companies   | name                     | text                     | NO          |
| companies   | name_ar                  | text                     | YES         |
| companies   | status                   | text                     | YES         |
| companies   | industry                 | text                     | YES         |
| companies   | employee_count           | integer                  | YES         |
| companies   | priority                 | text                     | YES         |
| companies   | city                     | text                     | YES         |
| companies   | address                  | text                     | YES         |
| companies   | cr_number                | text                     | YES         |
| companies   | tax_card                 | text                     | YES         |
| companies   | current_insurer          | text                     | YES         |
| companies   | insurance_type           | text                     | YES         |
| companies   | medical_subtype          | text                     | YES         |
| companies   | checklist_status         | jsonb                    | YES         |
| companies   | checklist_completion     | text                     | YES         |
| companies   | expected_renewal_date    | text                     | YES         |
| companies   | expected_offer_date      | date                     | YES         |
| companies   | actual_renewal_date      | text                     | YES         |
| companies   | actual_offer_date        | date                     | YES         |
| companies   | primary_contact_title    | text                     | YES         |
| companies   | primary_contact_name     | text                     | YES         |
| companies   | primary_contact_phone    | text                     | YES         |
| companies   | primary_contact_email    | text                     | YES         |
| companies   | website                  | text                     | YES         |
| companies   | linkedin_page            | text                     | YES         |
| companies   | landline                 | text                     | YES         |
| companies   | assigned_user_id         | text                     | YES         |
| companies   | assigned_user_name       | text                     | YES         |
| companies   | source                   | text                     | YES         |
| companies   | last_contact_date        | timestamp with time zone | YES         |
| companies   | call_date                | timestamp with time zone | YES         |
| companies   | follow_up_date           | timestamp with time zone | YES         |
| companies   | renewal_month            | text                     | YES         |
| companies   | notes                    | text                     | YES         |
| companies   | created_at               | timestamp with time zone | YES         |
| companies   | updated_at               | timestamp with time zone | YES         |
| companies   | second_contact_mobile    | text                     | YES         |
| companies   | third_contact_mobile     | text                     | YES         |
| companies   | meeting_time             | timestamp with time zone | YES         |
| companies   | request_meeting_notes    | text                     | YES         |
| companies   | request_quotation_notes  | text                     | YES         |
| companies   | hr_left_notes            | text                     | YES         |
| companies   | waiting_for_data_notes   | text                     | YES         |
| companies   | call_back_notes          | text                     | YES         |
| companies   | send_profile_notes       | text                     | YES         |
| companies   | renewed_notes            | text                     | YES         |
| companies   | not_interested_notes     | text                     | YES         |
| companies   | wrong_number_notes       | text                     | YES         |
| companies   | no_answer_notes          | text                     | YES         |
| companies   | hr_left_new_company_name | text                     | YES         |
| companies   | hr_left_current_insurer  | text                     | YES         |
| companies   | hr_left_employee_count   | integer                  | YES         |
| companies   | hr_left_renewal_month    | text                     | YES         |