import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  type Firestore,
  type QueryDocumentSnapshot
} from "@/firebase";
import { Company, Activity } from "@/lib/types";
import { normalizeCompanyName } from "@/lib/data-quality";
import { logAuditEvent } from "@/lib/audit-logger";

export class CRMService {
  private firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  /**
   * Generates a unique client code.
   * Format: IWIB-YYYY-[SEQUENCE]
   */
  async generateClientCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `IWIB-${year}-`;

    const companiesRef = collection(this.firestore, 'companies');
    const q = query(
      companiesRef,
      where('code', '>=', prefix),
      where('code', '<=', prefix + '\uf8ff'),
      orderBy('code', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    let nextNumber = 1;

    if (!querySnapshot.empty) {
      const lastCode = querySnapshot.docs[0].data().code;
      const parts = lastCode.split('-');
      const lastNumber = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a new company with auto-assignment and code generation.
   */
  async createCompany(data: Partial<Company>, userId?: string, userName?: string): Promise<string> {
    const companiesRef = collection(this.firestore, 'companies');
    const snapshot = await getDocs(companiesRef);
    const normalizedInput = normalizeCompanyName(data.name || "");

    const duplicate = snapshot.docs.find((d: any) => {
      const name = d.data().name || "";
      return normalizeCompanyName(name) === normalizedInput;
    });

    if (duplicate) {
      await logAuditEvent(this.firestore, userId ? { uid: userId, email: userName } : null, {
        action: 'duplicate_attempt',
        resource_type: 'company',
        resource_name: data.name,
        changes: { attempt: 'create', reason: 'Company with this name already exists (case-insensitive)' }
      });
      throw new Error("Company with this name already exists");
    }

    const code = await this.generateClientCode();

    // Normalize formatting before saving
    const formattedName = data.name ? data.name.trim().replace(/\s+/g, ' ') : "";

    const companyData: Partial<Company> = {
      ...data,
      name: formattedName,
      code,
      created_at: new Date().toISOString(),
      updated_at: serverTimestamp(),
      assigned_user_id: data.assigned_user_id || userId || "",
      assigned_user_name: data.assigned_user_name || userName || "",
      status: data.status || 'interested',
    };

    const docRef = await addDoc(collection(this.firestore, "companies"), companyData);

    // Log successful creation in audit logs
    await logAuditEvent(this.firestore, userId ? { uid: userId, email: userName } : null, {
      action: 'create',
      resource_type: 'company',
      resource_id: docRef.id,
      resource_name: formattedName,
      changes: companyData
    });

    // Initial Automation Check
    await this.handleWorkflowTriggers(docRef.id, companyData as Company);

    return docRef.id;
  }

  /**
   * Updates a company and triggers automation if status changes.
   */
  async updateCompany(id: string, data: Partial<Company>, oldData?: Company): Promise<void> {
    if (data.name) {
      const companiesRef = collection(this.firestore, 'companies');
      const snapshot = await getDocs(companiesRef);
      const normalizedInput = normalizeCompanyName(data.name);

      const duplicate = snapshot.docs.find((d: any) => {
        const company = d.data();
        return d.id !== id && normalizeCompanyName(company.name || "") === normalizedInput;
      });

      if (duplicate) {
        throw new Error("Company with this name already exists");
      }
      
      // Clean name format
      data.name = data.name.trim().replace(/\s+/g, ' ');
    }

    const updateData = {
      ...data,
      updated_at: serverTimestamp(),
    };

    // Remove code from update to ensure it's non-editable
    delete (updateData as any).code;

    await updateDoc(doc(this.firestore, "companies", id), updateData);

    // Check for status change triggers
    if (data.status && oldData && data.status !== oldData.status) {
      await this.handleWorkflowTriggers(id, { ...oldData, ...data } as Company);
      await this.handleLeadConversion(id, { ...oldData, ...data } as Company);
    }
  }

  /**
   * Automated Task Creation Engine
   */
  async handleWorkflowTriggers(companyId: string, company: Company, activeActions: string[] = []): Promise<void> {
    const status = company.status;

    // 1. Date-based Automation (Offer Dates within 2 weeks)
    await this.checkDateTriggeredTasks(companyId, company);

    // 2. Action-based Automation
    for (const action of activeActions) {
      let taskSubject = "";
      let assignToId = company.assigned_user_id;
      let assignToName = company.assigned_user_name;
      let dueDate = new Date(Date.now() + 86400000).toISOString(); // Default: Tomorrow

      switch (action) {
        case 'request_meeting':
          taskSubject = `Schedule Meeting: ${company.name}`;
          // Assign to Sales Manager (In a real app, fetch manager user)
          assignToName = "Sales Manager";
          break;
        case 'request_quotation':
          taskSubject = `Prepare Quotation: ${company.name}`;
          assignToName = "Sales Manager";
          break;
        case 'waiting_for_data':
          taskSubject = `Follow up for Data: ${company.name}`;
          if (company.follow_up_date) dueDate = company.follow_up_date;
          break;
        case 'call_back':
          taskSubject = `Call Back: ${company.name}`;
          if (company.follow_up_date) dueDate = company.follow_up_date;
          break;
        case 'send_profile':
          taskSubject = `Send Company Profile: ${company.name}`;
          break;
        case 'renewed':
          taskSubject = `Renewal Processing: ${company.name}`;
          if (company.follow_up_date) dueDate = company.follow_up_date;
          break;
      }

      if (taskSubject) {
        const actionNotes = (company as any)[`${action}_notes`] || "";
        await this.createAutomatedTask(
          companyId,
          company.name,
          taskSubject,
          assignToId,
          assignToName,
          dueDate,
          actionNotes
        );
      }
    }
  }

  private async checkDateTriggeredTasks(companyId: string, company: Company) {
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
            companyId,
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

  private async createAutomatedTask(
    companyId: string,
    companyName: string,
    subject: string,
    assignedId?: string,
    assignedName?: string,
    dueDate?: string,
    notes?: string
  ) {
    const tasksRef = collection(this.firestore, 'activities');
    const q = query(
      tasksRef,
      where('related_id', '==', companyId),
      where('subject', '==', subject),
      where('status', '==', 'pending')
    );

    const existing = await getDocs(q);
    if (!existing.empty) return;

    const task: Partial<Activity> = {
      activity_type: 'task',
      subject,
      description: notes ? `INTERACTION NOTES:\n${notes}` : "Automated CRM task.",
      status: 'pending',
      priority: 'high',
      due_date: dueDate || new Date(Date.now() + 86400000).toISOString(),
      related_type: 'company',
      related_id: companyId,
      related_name: companyName,
      assigned_to_id: assignedId || "",
      assigned_to_name: assignedName || "",
      created_at: new Date().toISOString()
    };

    await addDoc(collection(this.firestore, "activities"), task);
  }

  /**
   * Lead Conversion & Date Fallbacks
   */
  async handleLeadConversion(companyId: string, company: Company): Promise<void> {
    const conversionTriggers = [
      'request_meeting',
      'request_quotation',
      'waiting_for_data',
      'send_profile'
    ];

    let updates: Partial<Company> = {};
    const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

    // Date Fallbacks
    if (company.actual_renewal_date && !company.actual_offer_date) {
      const idx = MONTHS.indexOf(company.actual_renewal_date.toLowerCase());
      if (idx !== -1) {
        const targetMonth = (idx - 2 + 12) % 12;
        const now = new Date();
        let year = now.getFullYear();
        if (targetMonth < now.getMonth()) year++;
        updates.actual_offer_date = `${year}-${String(targetMonth + 1).padStart(2, '0')}-01`;
      }
    }

    if (company.expected_renewal_date && !company.expected_offer_date) {
      const idx = MONTHS.indexOf(company.expected_renewal_date.toLowerCase());
      if (idx !== -1) {
        const targetMonth = (idx - 2 + 12) % 12;
        const now = new Date();
        let year = now.getFullYear();
        if (targetMonth < now.getMonth()) year++;
        updates.expected_offer_date = `${year}-${String(targetMonth + 1).padStart(2, '0')}-01`;
      }
    }

    // Removed the lead conversion overwrite to allow specific interaction statuses 
    // (Request Meeting, etc.) to be displayed on the home page as requested.

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(this.firestore, "companies", companyId), {
        ...updates,
        updated_at: serverTimestamp()
      });
    }
  }
}
/**
 * STANDALONE WRAPPERS FOR DIRECT USE IN COMPONENTS
 */

export async function assignLeadRoundRobin(firestore: Firestore, companyId: string) {
  const usersRef = collection(firestore, 'users');
  const q = query(usersRef, where('status', '==', 'active'), limit(20));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const users = snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));
  // Simple random for now, or fetch last assigned from a metadata table if exists
  const randomUser = users[Math.floor(Math.random() * users.length)];

  await updateDoc(doc(firestore, "companies", companyId), {
    assigned_user_id: randomUser.id,
    assigned_user_name: (randomUser as any).name || ""
  });
}

export function calculateLeadScore(company: Partial<Company>) {
  let score = 50; // Base score

  if (company.employee_count) {
    if (company.employee_count > 100) score += 20;
    else if (company.employee_count > 20) score += 10;
  }

  if (company.priority === 'high' || company.priority === 'critical') score += 15;
  if (company.primary_contact_email && company.primary_contact_phone) score += 10;
  if (company.industry) score += 5;

  return {
    related_id: (company as any).id,
    score: Math.min(score, 100),
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
    factors: [
      { factor: 'Initial Profile Completeness', points: score }
    ],
    last_calculated: new Date().toISOString()
  };
}

export async function processWorkflowTriggers(firestore: Firestore, event: string, data: any) {
  const service = new CRMService(firestore);
  if (event === 'new_lead') {
    await service.handleWorkflowTriggers(data.id, data as Company);
  }
}
