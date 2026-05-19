
'use client';

import { supabase } from '@/lib/supabase';

/**
 * Supabase Shims for Firestore functions.
 * These allow us to use the same Firestore-like API but interact with Supabase.
 */

export type Firestore = any;
export type CollectionReference = { type: 'collection'; path: string; constraints?: any[] };
export type DocumentReference = { type: 'doc'; path: string };
export type SetOptions = { merge?: boolean };
export type QueryDocumentSnapshot<T = any> = { id: string; data: () => T };

export const collection = (db: any, path: string): CollectionReference => {
  return {
    type: 'collection',
    path: path,
  };
};

export const doc = (dbOrRef: any, path?: string, ...pathSegments: string[]): DocumentReference => {
  if (typeof dbOrRef === 'object' && dbOrRef.type === 'collection') {
    // Support doc(collectionRef) and doc(collectionRef, "id")
    const base = dbOrRef.path;
    // CRITICAL FIX: Supabase/PostgreSQL tables often require UUIDs for primary keys.
    // Firebase-style alphanumeric IDs will cause "invalid input syntax for type uuid" errors.
    const uuidV4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    const id = path || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uuidV4());
    return {
      type: 'doc',
      path: `${base}/${id}`,
    };
  }

  // Support doc(db, "path", "segments")
  if (!path) {
    throw new Error('doc shim: path is required when first argument is not a CollectionReference');
  }
  const fullPath = [path, ...pathSegments].join('/');
  return {
    type: 'doc',
    path: fullPath,
  };
};

/**
 * Helper to map Firestore paths to Supabase tables.
 * Handles subcollections like 'policies/{id}/members' -> 'policy_members'.
 */
const getTableName = (path: string) => {
  if (!path) return '';
  const segments = path.split('/');
  
  // Case 1: Simple collection (e.g., 'policies')
  if (segments.length === 1) return segments[0];
  
  // Case 2: Document path (e.g., 'policies/abc')
  if (segments.length === 2) return segments[0];
  
  // Case 3: Subcollection (e.g., 'policies/abc/members')
  if (segments.length === 3) {
    if (segments[0] === 'policies' && segments[2] === 'members') return 'policy_members';
    return segments[2];
  }
  
  // Case 4: Subcollection document (e.g., 'policies/abc/members/xyz')
  if (segments.length === 4) {
    if (segments[0] === 'policies' && segments[2] === 'members') return 'policy_members';
    return segments[2];
  }
  
  return segments[0];
};

// Cache of database table columns discovered dynamically from PostgREST/OpenAPI
let schemaCache: Record<string, string[]> = {};
let schemaPromise: Promise<void> | null = null;

const fetchSchema = async () => {
  if (Object.keys(schemaCache).length > 0) return;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseKey) return;

    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const data = await response.json();
    if (data && data.definitions) {
      Object.keys(data.definitions).forEach(tableName => {
        const tableDef = data.definitions[tableName];
        if (tableDef && tableDef.properties) {
          schemaCache[tableName] = Object.keys(tableDef.properties);
        }
      });
      console.log("[shims] Database schema columns cached successfully:", Object.keys(schemaCache));
    }
  } catch (err) {
    console.error("[shims] Failed to fetch schema dynamically:", err);
  }
};

const ensureSchema = async () => {
  if (Object.keys(schemaCache).length > 0) return;
  if (!schemaPromise) {
    schemaPromise = fetchSchema();
  }
  await Promise.race([
    schemaPromise,
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);
};

// Pre-fetch schema on client load
if (typeof window !== 'undefined') {
  fetchSchema();
}

// Filter record data to only contain columns that exist in the active database table
const filterTableColumns = (table: string, recordData: any) => {
  const allowed = schemaCache[table];
  if (!allowed || allowed.length === 0) {
    if (table === 'companies') {
      const companiesSafeguard = [
        'id', 'code', 'name', 'name_ar', 'status', 'industry', 'employee_count', 'priority', 
        'city', 'address', 'cr_number', 'tax_card', 'current_insurer', 'insurance_type', 
        'medical_subtype', 'checklist_status', 'checklist_completion', 'expected_renewal_date', 
        'expected_offer_date', 'actual_renewal_date', 'actual_offer_date', 'primary_contact_title', 
        'primary_contact_name', 'primary_contact_phone', 'primary_contact_email', 'second_contact_mobile', 
        'third_contact_mobile', 'website', 'linkedin_page', 'landline', 'assigned_user_id', 
        'assigned_user_name', 'source', 'last_contact_date', 'call_date', 'follow_up_date', 
        'renewal_month', 'notes', 'created_at', 'updated_at', 'meeting_time', 'call_back_notes', 
        'wrong_number_notes', 'no_answer_notes', 'not_interested_notes', 'send_profile_notes', 
        'waiting_for_data_notes', 'request_meeting_notes', 'request_quotation_notes', 'renewed_notes',
        'hr_left_current_insurer', 'hr_left_data_receiving_date', 'hr_left_employee_count',
        'hr_left_new_company_name', 'hr_left_notes', 'hr_left_renewal_month'
      ];
      const filtered: Record<string, any> = {};
      Object.keys(recordData).forEach(key => {
        if (companiesSafeguard.includes(key)) {
          filtered[key] = recordData[key];
        }
      });
      return filtered;
    }
    return recordData;
  }

  const filtered: Record<string, any> = {};
  Object.keys(recordData).forEach(key => {
    if (allowed.includes(key)) {
      filtered[key] = recordData[key];
    }
  });
  return filtered;
};

export const addDoc = async (colRef: any, data: any) => {
  const path = colRef?.path;
  if (!path) throw new Error('addDoc shim: table path missing');
  const table = getTableName(path);

  // 1. Force to a plain object
  const cleanData = JSON.parse(JSON.stringify(data));
  
  // 2. CRITICAL FIX: Convert empty strings to null for database compatibility
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === "" || cleanData[key] === undefined) {
      cleanData[key] = null;
    }
  });

  // Ensure schema is loaded and filter columns
  await ensureSchema();
  const filteredData = filterTableColumns(table, cleanData);

  console.log(`[addDoc] Attempting insert into ${table} (Path: ${path}):`, filteredData);

  const { data: result, error } = await supabase
    .from(table)
    .insert(filteredData)
    .select()
    .single();

  if (error) {
    console.error(`[addDoc] Supabase Error for ${table}:`, error.message, error);
    throw error;
  }

  return {
    id: result.id,
    path: `${path}/${result.id}`,
    ...result
  };
};

export const getDoc = async (docRef: any) => {
  const path = docRef.path;
  const segments = path.split('/');
  const table = getTableName(path);
  const id = segments[segments.length - 1];

  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();

  if (error && error.code !== 'PGRST116') throw error;

  return {
    exists: () => !!data,
    data: () => data,
    id
  };
};

export const getDocs = async (queryRef: any) => {
  const path = queryRef.path;
  const table = getTableName(path);
  let q = supabase.from(table).select('*');

  if (queryRef.constraints) {
    queryRef.constraints.forEach((c: any) => {
      if (c.type === 'where') {
        if (c.op === '==' || c.op === '===') q = q.eq(c.field, c.value);
        else if (c.op === '>=') q = q.gte(c.field, c.value);
        else if (c.op === '<=') q = q.lte(c.field, c.value);
      } else if (c.type === 'orderBy') {
        q = q.order(c.field, { ascending: c.dir === 'asc' });
      } else if (c.type === 'limit') {
        q = q.limit(c.value);
      }
    });
  }

  const { data, error } = await q;
  if (error) throw error;

  return {
    docs: (data || []).map((d: any) => ({
      id: d.id,
      data: () => d
    })),
    empty: !data || data.length === 0
  };
};

export const updateDoc = async (docRef: any, data: any) => {
  const path = docRef.path;
  const segments = path.split('/');
  const table = getTableName(path);
  const id = segments[segments.length - 1];

  // Sanitize: remove undefined values
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    cleanData[key] = value === "" ? null : value;
  }

  // Ensure schema is loaded and filter columns
  await ensureSchema();
  const filteredData = filterTableColumns(table, cleanData);

  const { error } = await supabase
    .from(table)
    .update(filteredData)
    .eq('id', id);

  if (error) {
    console.error(`Error in updateDoc shim for ${table}/${id}:`, error.message);
    throw error;
  }
};

export const setDoc = async (docRef: any, data: any, options?: SetOptions) => {
  const path = docRef.path;
  const segments = path.split('/');
  const table = getTableName(path);
  const id = segments[segments.length - 1];

  // Map data and ensure ID is present
  const payload = { id, ...data };
  Object.keys(payload).forEach(key => {
    if (payload[key] === "") payload[key] = null;
  });

  // Ensure schema is loaded and filter columns
  await ensureSchema();
  const filteredPayload = filterTableColumns(table, payload);

  const { error } = await supabase
    .from(table)
    .upsert(filteredPayload);

  if (error) {
    console.error(`Error in setDoc shim for ${table}/${id}:`, error.message);
    throw error;
  }
};

export const deleteDoc = async (docRef: any) => {
  const path = docRef.path;
  const segments = path.split('/');
  const table = getTableName(path);
  const id = segments[segments.length - 1];

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      console.error(`Foreign Key Violation in deleteDoc for ${table}/${id}: This record is linked to other data (e.g. policies or claims) and cannot be deleted until those links are removed.`);
      const customError = new Error(`Cannot delete ${table} because it is referenced by other records.`);
      (customError as any).code = 'FOREIGN_KEY_VIOLATION';
      throw customError;
    }
    console.error(`Error in deleteDoc shim for ${table}/${id}:`, error.message);
    throw error;
  }
};

export const writeBatch = (db: any) => {
  const sets: Record<string, any[]> = {};
  const otherOps: (() => Promise<any>)[] = [];

  return {
    set: (docRef: any, data: any) => {
      const path = docRef.path;
      const segments = path.split('/');
      const table = getTableName(path);
      const id = segments[segments.length - 1];
      
      if (!sets[table]) sets[table] = [];
      
      const payload = { id, ...data };
      Object.keys(payload).forEach(key => {
        if (payload[key] === "") payload[key] = null;
      });
      sets[table].push(payload);
    },
    update: (docRef: any, data: any) => {
      otherOps.push(() => updateDoc(docRef, data));
    },
    delete: (docRef: any) => {
      otherOps.push(() => deleteDoc(docRef));
    },
    commit: async () => {
      // Ensure schema is loaded before committing
      await ensureSchema();

      // 1. Process bulk sets grouped by table
      for (const [table, records] of Object.entries(sets)) {
        // Filter columns for each record in the set
        const filteredRecords = records.map(rec => filterTableColumns(table, rec));

        // Chunk to avoid massive payloads (500 records per request is a safe limit)
        const chunkSize = 500;
        for (let i = 0; i < filteredRecords.length; i += chunkSize) {
          const chunk = filteredRecords.slice(i, i + chunkSize);
          console.log(`[writeBatch] Bulk upserting ${chunk.length} records into ${table}...`);
          const { error } = await supabase.from(table).upsert(chunk);
          if (error) {
            console.error(`Error in bulk upsert for ${table}:`, error.message);
            throw error;
          }
        }
      }
      
      // 2. Process other operations (updates, deletes)
      for (const op of otherOps) {
        await op();
      }
    }
  };
};

export const query = (colRef: any, ...constraints: any[]) => {
  return {
    ...colRef,
    constraints
  };
};

export const where = (field: string, op: string, value: any) => ({ type: 'where', field, op, value });
export const orderBy = (field: string, dir: string = 'asc') => ({ type: 'orderBy', field, dir });
export const limit = (n: number) => ({ type: 'limit', value: n });
export const serverTimestamp = () => new Date().toISOString();
