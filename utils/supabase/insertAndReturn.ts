import { SupabaseClient } from '@supabase/supabase-js';

export async function insertAndReturn<T>(
  supabase: SupabaseClient,
  table: string,
  data: Partial<T> | Partial<T>[]
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  const insertPayload = Array.isArray(data) ? data : [data];

  const { data: result, error } = await supabase
    .from(table)
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: result as T, error: null };
} 