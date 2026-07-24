import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { calculateLeadScore } from "@/lib/domain/lead-scoring";
import { ContactService } from "./contact.service";
import type { Company } from "@/lib/types";

export interface LeadSyncContactData {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_id?: string;
  company_name?: string;
  role_type?: string;
  role_id?: string;
  is_primary?: boolean;
  notes?: string;
}

export class LeadService {
  private static cleanUuid(uuidStr?: string) {
    if (!uuidStr) return null;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuidStr) ? uuidStr : null;
  }

  /**
   * Syncs a lead's contact information into the CRM contacts table.
   */
  static async syncContact(data: LeadSyncContactData) {
    if (!data.name) return;

    try {
      const nameParts = data.name.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const email = data.email?.toLowerCase().trim() || undefined;

      await ContactService.syncContact({
        first_name,
        last_name,
        email,
        phone: data.phone || undefined,
        mobile: data.mobile || undefined,
        role_type: data.role_type || undefined,
        role_id: data.role_id || undefined,
        company_id: this.cleanUuid(data.company_id) || undefined,
        company_name: data.company_name || undefined,
        is_primary: !!data.is_primary,
        preferred_contact_method: "Email",
        entity_type: 'lead',
        entity_id: this.cleanUuid(data.company_id) || undefined,
        notes: data.notes || `[Auto-synced from LeadService]`
      } as any, null, "LeadService");
    } catch (error) {
      console.error("Error syncing contact in LeadService:", error);
    }
  }

  /**
   * Helper to automatically assign lead to a Sales Manager by department/level hierarchy.
   */
  static async assignLeadToSalesManager(companyId: string) {
    // 1. Try Sales Managers
    const { data: salesManagers } = await supabase
      .from('users')
      .select('id, name')
      .eq('status', 'active')
      .eq('department', 'Sales')
      .eq('level', 'Manager')
      .limit(1);

    let assignedUser = null;

    if (salesManagers && salesManagers.length > 0) {
      assignedUser = salesManagers[0];
    } else {
      // 2. Try Sales Staff
      const { data: salesStaff } = await supabase
        .from('users')
        .select('id, name')
        .eq('status', 'active')
        .eq('department', 'Sales')
        .limit(1);
        
      if (salesStaff && salesStaff.length > 0) {
        assignedUser = salesStaff[0];
      } else {
        // 3. Try generic Managers
        const { data: genericManagers } = await supabase
          .from('users')
          .select('id, name')
          .eq('status', 'active')
          .eq('level', 'Manager')
          .limit(1);
          
        if (genericManagers && genericManagers.length > 0) {
          assignedUser = genericManagers[0];
        } else {
          // 4. Try any active user
          const { data: anyActive } = await supabase
            .from('users')
            .select('id, name')
            .eq('status', 'active')
            .limit(1);
          if (anyActive && anyActive.length > 0) {
            assignedUser = anyActive[0];
          }
        }
      }
    }

    if (!assignedUser) return;

    // Update Companies & Leads table
    await supabase
      .from('companies')
      .update({
        assigned_user_id: assignedUser.id,
        assigned_user_name: assignedUser.name || ""
      })
      .eq('id', companyId);

    await supabase
      .from('leads')
      .update({
        assigned_user_id: assignedUser.id,
        assigned_user_name: assignedUser.name || ""
      })
      .eq('company_id', companyId);
  }

  /**
   * Helper to create automated follow-up/deadline task.
   */
  static async createAutomatedTask(
    companyId: string,
    companyName: string,
    subject: string,
    assignedId?: string,
    assignedName?: string,
    dueDate?: string,
    notes?: string
  ) {
    const { data: existing, error } = await supabase
      .from('activities')
      .select('id')
      .eq('related_id', companyId)
      .eq('subject', subject)
      .eq('status', 'pending');

    if (error || (existing && existing.length > 0)) return;

    const startIso = dueDate || new Date(Date.now() + 86400000).toISOString();
    const endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString(); // 1 hour default

    const task = {
      activity_type: 'task',
      subject,
      description: notes ? `INTERACTION NOTES:\n${notes}` : "Automated CRM task.",
      status: 'pending',
      priority: 'high',
      due_date: startIso,
      end_date: endIso,
      duration_minutes: 60,
      related_type: 'company',
      related_id: this.cleanUuid(companyId),
      related_name: companyName,
      assigned_to_id: this.cleanUuid(assignedId),
      assigned_to_name: assignedName || "",
      created_at: new Date().toISOString()
    };

    await supabase.from('activities').insert(sanitizeUUIDs(task));
  }

  /**
   * Process and execute automated workflow triggers.
   */
  static async processWorkflowTriggers(event: string, company: Company) {
    if (event === 'new_lead') {
      const now = new Date();
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;

      const datesToCheck = [
        { date: company.expected_offer_date, label: 'Expected Offer' },
        { date: company.actual_offer_date, label: 'Actual Offer' }
      ];

      for (const item of datesToCheck) {
        if (item.date) {
          const d = new Date(item.date);
          const diff = d.getTime() - now.getTime();
          if (diff > 0 && diff <= twoWeeks) {
            await this.createAutomatedTask(
              company.id,
              company.name,
              `${item.label} Deadline Approaching`,
              company.assigned_user_id,
              company.assigned_user_name,
              item.date
            );
          }
        }
      }
    }
  }

  /**
   * Creates a new lead and associated company record.
   */
  static async createLead(formData: any) {
    // 1. Create Company
    const companyPayload = { ...formData };
    delete companyPayload.primary_contact_title;
    delete companyPayload.primary_contact_name;
    delete companyPayload.primary_contact_phone;
    delete companyPayload.primary_contact_email;
    delete companyPayload.primary_contact_role_id;
    delete companyPayload.second_contact_title;
    delete companyPayload.second_contact_name;
    delete companyPayload.second_contact_mobile;
    delete companyPayload.second_contact_email;
    delete companyPayload.second_contact_role_id;
    delete companyPayload.third_contact_title;
    delete companyPayload.third_contact_name;
    delete companyPayload.third_contact_mobile;
    delete companyPayload.third_contact_email;
    delete companyPayload.third_contact_role_id;

    const { data: newCompany, error: insertCompError } = await supabase
      .from('companies')
      .insert(sanitizeUUIDs({
        ...companyPayload,
        status: 'lead',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      .select()
      .single();

    if (insertCompError) throw insertCompError;

    const company_id = newCompany.id;
    const company_name = formData.name;

    // 2. Create Lead
    const { data: newLead, error: insertLeadError } = await supabase
      .from('leads')
      .insert(sanitizeUUIDs({
        company_id: this.cleanUuid(company_id),
        company_name: company_name,
        contact_name: formData.primary_contact_name || "",
        email: formData.primary_contact_email || "",
        phone: formData.primary_contact_phone || "",
        status: 'new',
        priority: formData.priority || "medium",
        assigned_user_name: formData.assigned_user_name || "",
        assigned_user_id: this.cleanUuid(formData.assigned_user_id),
        notes: formData.notes || "",
        source: formData.source || "",
        created_at: new Date().toISOString()
      }))
      .select('id')
      .single();

    if (insertLeadError) throw insertLeadError;

    if (newLead) {
      await supabase
        .from('lead_details')
        .insert(sanitizeUUIDs({
          lead_id: newLead.id,
          company_id: this.cleanUuid(company_id),
          contact_person: formData.primary_contact_name || "",
          phone: formData.primary_contact_phone || "",
          email: formData.primary_contact_email || "",
          meeting_date: formData.meeting_date || null,
          requirements: formData.requirements || "",
          estimated_premium: formData.estimated_premium || 0,
          source: formData.source || ""
        }));
    }

    // 3. Auto-Assignment to Sales Manager
    await this.assignLeadToSalesManager(company_id);

    // 4. Calculate & Insert Lead Score
    const score = calculateLeadScore({ ...formData, id: company_id } as any);
    await supabase
      .from('lead_scores')
      .insert(sanitizeUUIDs({
        related_id: this.cleanUuid(company_id),
        score: score.score,
        grade: score.grade,
        factors: score.factors,
        last_calculated: new Date().toISOString()
      }));

    // 5. Process workflow triggers
    await this.processWorkflowTriggers('new_lead', { ...formData, id: company_id } as any);

    // 6. Sync Multi-Level Contacts
    await this.syncMultiLevelContacts(formData, company_id, company_name);

    return company_id;
  }

  /**
   * Updates an existing lead.
   */
  static async updateLead(leadId: string, companyId: string, formData: any) {
    const companyPayload = { ...formData };
    delete companyPayload.primary_contact_title;
    delete companyPayload.primary_contact_name;
    delete companyPayload.primary_contact_phone;
    delete companyPayload.primary_contact_email;
    delete companyPayload.primary_contact_role_id;
    delete companyPayload.second_contact_title;
    delete companyPayload.second_contact_name;
    delete companyPayload.second_contact_mobile;
    delete companyPayload.second_contact_email;
    delete companyPayload.second_contact_role_id;
    delete companyPayload.third_contact_title;
    delete companyPayload.third_contact_name;
    delete companyPayload.third_contact_mobile;
    delete companyPayload.third_contact_email;
    delete companyPayload.third_contact_role_id;

    // Update Company profile
    if (companyId) {
      const { error: updateCompError } = await supabase
        .from('companies')
        .update({
          ...companyPayload,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (updateCompError) throw updateCompError;
    }

    // Update Lead record
    const { error: updateLeadError } = await supabase
      .from('leads')
      .update({
        company_name: formData.name,
        contact_name: formData.primary_contact_name || "",
        email: formData.primary_contact_email || "",
        phone: formData.primary_contact_phone || "",
        priority: formData.priority || "medium",
        assigned_user_name: formData.assigned_user_name || "",
        assigned_user_id: this.cleanUuid(formData.assigned_user_id),
        notes: formData.notes || "",
        source: formData.source || ""
      })
      .eq('id', leadId);

    if (updateLeadError) throw updateLeadError;

    // Update Lead details
    await supabase
      .from('lead_details')
      .upsert(sanitizeUUIDs({
        lead_id: leadId,
        company_id: this.cleanUuid(companyId),
        contact_person: formData.primary_contact_name || "",
        phone: formData.primary_contact_phone || "",
        email: formData.primary_contact_email || "",
        meeting_date: formData.meeting_date || null,
        requirements: formData.requirements || "",
        estimated_premium: formData.estimated_premium || 0,
        source: formData.source || "",
        updated_at: new Date().toISOString()
      }), { onConflict: 'lead_id' });

    // Sync Multi-Level Contacts
    const finalCompId = companyId || leadId;
    await this.syncMultiLevelContacts(formData, finalCompId, formData.name);
  }

  /**
   * Helper to sync multi-level contacts.
   */
  private static async syncMultiLevelContacts(formData: any, company_id: string, company_name: string) {
    if (formData.primary_contact_name && formData.primary_contact_email) {
      await this.syncContact({
        name: formData.primary_contact_name,
        email: formData.primary_contact_email,
        phone: formData.primary_contact_phone,
        role_id: formData.primary_contact_role_id,
        company_id, company_name, is_primary: true
      });
    }
    if (formData.second_contact_name && formData.second_contact_email) {
      await this.syncContact({
        name: formData.second_contact_name,
        email: formData.second_contact_email,
        mobile: formData.second_contact_mobile,
        role_id: formData.second_contact_role_id,
        company_id, company_name
      });
    }
    if (formData.third_contact_name && formData.third_contact_email) {
      await this.syncContact({
        name: formData.third_contact_name,
        email: formData.third_contact_email,
        mobile: formData.third_contact_mobile,
        role_id: formData.third_contact_role_id,
        company_id, company_name
      });
    }
  }

  /**
   * Deletes a lead and its associated company record.
   */
  static async deleteLead(leadId: string, companyId?: string) {
    const { error: deleteLeadError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (deleteLeadError) throw deleteLeadError;

    if (companyId) {
      const { error: deleteCompError } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (deleteCompError) throw deleteCompError;
    }
  }

  /**
   * Converts a lead to a prospect.
   */
  static async convertToProspect(lead: any, conversionData: any, currentUser: any, companies: any[]) {
    const companyId = lead.company_id || lead.id;
    const companyName = lead.company_name || lead.name;
    const comp = companies.find(c => c.id === companyId);
    const insType = comp?.insurance_type || lead.insurance_type || "Medical";

    const prospectPayload = {
      company_name: companyName,
      company_id: this.cleanUuid(companyId),
      lead_id: this.cleanUuid(lead.id),
      pipeline_stage: 'qualification',
      probability: conversionData.probability,
      estimated_value: conversionData.estimated_value,
      expected_close_date: conversionData.expected_close_date,
      assigned_user_name: lead.assigned_user_name || currentUser?.name || "",
      assigned_user_id: this.cleanUuid(lead.assigned_user_id || currentUser?.id),
      notes: conversionData.notes,
      requested_products: [insType],
      created_at: new Date().toISOString()
    };

    const { data: newProspect, error: insertError } = await supabase
      .from('prospects')
      .insert(sanitizeUUIDs(prospectPayload))
      .select('id')
      .single();

    if (insertError) throw insertError;

    if (newProspect) {
      await supabase
        .from('prospect_details')
        .insert(sanitizeUUIDs({
          prospect_id: newProspect.id,
          company_id: this.cleanUuid(companyId),
          proposal_versions: conversionData.proposal_versions || [],
          final_premium: conversionData.estimated_value || 0,
          insurance_company: conversionData.insurance_company || comp?.current_insurer || "",
          commission: conversionData.commission || 0,
          decision_maker: conversionData.decision_maker || "",
          competitors: conversionData.competitors || [],
          notes: conversionData.notes || ""
        }));
    }

    // Update company status to 'prospect'
    if (lead.company_id) {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          status: 'prospect',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.company_id);

      if (updateError) throw updateError;
    }

    // Delete lead
    const { error: deleteLeadError } = await supabase
      .from('leads')
      .delete()
      .eq('id', lead.id);

    if (deleteLeadError) throw deleteLeadError;
  }

  /**
   * Bulk deletes leads and their associated companies.
   */
  static async bulkDelete(ids: string[], companyIds: string[]) {
    const { error: deleteLeadsError } = await supabase
      .from('leads')
      .delete()
      .in('id', ids);

    if (deleteLeadsError) throw deleteLeadsError;

    if (companyIds.length > 0) {
      const { error: deleteCompaniesError } = await supabase
        .from('companies')
        .delete()
        .in('id', companyIds);

      if (deleteCompaniesError) throw deleteCompaniesError;
    }
  }

  /**
   * Bulk assigns leads to a user.
   */
  static async bulkAssign(ids: string[], companyIds: string[], userId: string, userName: string) {
    const { error: updateLeadsError } = await supabase
      .from('leads')
      .update({
        assigned_user_id: this.cleanUuid(userId),
        assigned_user_name: userName
      })
      .in('id', ids);

    if (updateLeadsError) throw updateLeadsError;

    if (companyIds.length > 0) {
      const { error: updateCompaniesError } = await supabase
        .from('companies')
        .update({
          assigned_user_id: userId,
          assigned_user_name: userName,
          updated_at: new Date().toISOString()
        })
        .in('id', companyIds);

      if (updateCompaniesError) throw updateCompaniesError;
    }
  }
}
