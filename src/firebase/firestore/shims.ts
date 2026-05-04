
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
    const id = path || Math.random().toString(36).substring(2, 15);
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

export const addDoc = async (colRef: any, data: any) => {
  const table = colRef?.path;
  if (!table) {
    throw new Error('addDoc shim: colRef.path is undefined. Make sure you are using the shim collection() function.');
  }

  // Sanitize: remove undefined values and Firestore sentinel values
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && '_methodName' in (value as any)) continue;
    cleanData[key] = value;
  }

  const { data: result, error } = await supabase
    .from(table)
    .insert(cleanData)
    .select()
    .single();

  if (error) {
    console.error(`[addDoc] Supabase error for table "${table}":`, error);
    console.error(`[addDoc] Detailed error:`, JSON.stringify(error, null, 2));
    throw error;
  }

  return {
    id: result.id,
    path: `${table}/${result.id}`,
    ...result
  };
};

export const getDoc = async (docRef: any) => {
  const [table, id] = docRef.path.split('/');
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();

  if (error && error.code !== 'PGRST116') throw error;

  return {
    exists: () => !!data,
    data: () => data,
    id
  };
};

export const getDocs = async (queryRef: any) => {
  let table = queryRef.path;
  let q = supabase.from(table).select('*');

  if (queryRef.constraints) {
    queryRef.constraints.forEach((c: any) => {
      if (c.type === 'where') {
        if (c.op === '==') q = q.eq(c.field, c.value);
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
  const [table, id] = docRef.path.split('/');
  const { error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id);

  if (error) {
    console.error(`Error in updateDoc shim for ${table}/${id}:`, error);
    throw error;
  }
};

export const setDoc = async (docRef: any, data: any, options?: SetOptions) => {
  const [table, id] = docRef.path.split('/');
  const { error } = await supabase
    .from(table)
    .upsert({ id, ...data });

  if (error) {
    console.error(`Error in setDoc shim for ${table}/${id}:`, error);
    throw error;
  }
};

export const deleteDoc = async (docRef: any) => {
  const [table, id] = docRef.path.split('/');
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error in deleteDoc shim for ${table}/${id}:`, error);
    throw error;
  }
};

export const writeBatch = (db: any) => {
  const operations: (() => Promise<any>)[] = [];
  return {
    set: (docRef: any, data: any) => {
      operations.push(() => setDoc(docRef, data));
    },
    update: (docRef: any, data: any) => {
      operations.push(() => updateDoc(docRef, data));
    },
    delete: (docRef: any) => {
      operations.push(() => deleteDoc(docRef));
    },
    commit: async () => {
      for (const op of operations) {
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
