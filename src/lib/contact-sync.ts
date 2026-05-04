
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
  email: string;
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
  if (!data.email || !data.name) return;

  try {
    const contactsRef = collection(firestore, 'contacts');
    const q = query(contactsRef, where('email', '==', data.email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);

    const nameParts = data.name.trim().split(' ');
    const first_name = nameParts[0];
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const contactPayload: Omit<Contact, 'id'> = {
      first_name,
      last_name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || "",
      mobile: data.mobile || "",
      job_title: data.job_title || "",
      role_type: data.role_type || "",
      company_id: data.company_id || "",
      company_name: data.company_name || "",
      preferred_contact_method: "Email",
      is_primary: !!data.is_primary,
      notes: data.notes || "",
      created_at: new Date().toISOString()
    };

    if (!querySnapshot.empty) {
      // Update existing contact
      const existingDoc = querySnapshot.docs[0];
      const contactRef = doc(firestore, 'contacts', existingDoc.id);
      
      // Don't overwrite created_at
      const { created_at, ...updateData } = contactPayload;
      await updateDoc(contactRef, updateData);
      console.log(`Contact updated: ${data.email}`);
    } else {
      // Create new contact
      await addDoc(contactsRef, contactPayload);
      console.log(`Contact created: ${data.email}`);
    }
  } catch (error) {
    console.error("Error syncing contact:", error);
  }
}
