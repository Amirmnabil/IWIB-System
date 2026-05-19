
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  type Firestore
} from "@/firebase";
import { Contact } from "./types";

export interface SyncContactData {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  company_id?: string;
  company_name?: string;
  role_type?: string;
  is_primary?: boolean;
  notes?: string;
}

/**
 * Synchronizes a contact to the global 'contacts' collection.
 * If a contact with the same email exists, it updates it.
 * Otherwise, it creates a new record.
 */
export async function syncContact(firestore: Firestore, data: SyncContactData) {
  if (!data.name) return;

  try {
    const nameParts = data.name.trim().split(' ');
    const first_name = nameParts[0];
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';
    const email = data.email?.toLowerCase().trim() || "";

    const contactsRef = collection(firestore, 'contacts');
    let existingId = "";

    // Identification Logic:
    // 1. By Email (if provided)
    if (email) {
      // Normalize email for search
      const q = query(contactsRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) existingId = querySnapshot.docs[0].id;
    } 
    // 2. By Name + Company (if no email)
    else if (data.company_id) {
      // We look for any contact with this company_id
      const q = query(contactsRef, where('company_id', '==', data.company_id));
      const querySnapshot = await getDocs(q);
      
      // Manual check for normalized name matching (since we can't do case-insensitive eq in Firestore shim easily)
      const match = querySnapshot.docs.find((doc: { data: () => { first_name?: string; last_name?: string } }) => {
        const d = doc.data();
        const dFirst = (d.first_name || "").toLowerCase().trim();
        const dLast = (d.last_name || "").toLowerCase().trim();
        const targetFirst = first_name.toLowerCase().trim();
        const targetLast = last_name.toLowerCase().trim();
        
        return dFirst === targetFirst && (dLast === targetLast || (dLast === "-" && targetLast === ""));
      });

      if (match) existingId = match.id;
    }

    const contactPayload: Omit<Contact, 'id'> = {
      first_name,
      last_name,
      email,
      phone: data.phone || "",
      mobile: data.mobile || "",
      job_title: data.job_title || "",
      role_type: data.role_type || "",
      company_id: data.company_id || "",
      is_primary: !!data.is_primary,
      notes: data.notes || "",
      created_at: new Date().toISOString()
    };

    if (existingId) {
      // Update existing contact
      const contactRef = doc(firestore, 'contacts', existingId);
      
      // Don't overwrite created_at
      const { created_at, ...updateData } = contactPayload;
      await updateDoc(contactRef, updateData);
      console.log(`Contact updated: ${data.name} (${email || 'No email'})`);
    } else {
      // Create new contact
      await addDoc(contactsRef, contactPayload);
      console.log(`Contact created: ${data.name} (${email || 'No email'})`);
    }
  } catch (error) {
    console.error("Error syncing contact:", error);
  }
}
