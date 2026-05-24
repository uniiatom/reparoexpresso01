import { supabase } from '@/lib/supabase/client';

/**
 * Invoca Edge Function do Supabase (sem fallback Base44).
 * @param {string} name
 * @param {Record<string, unknown>} [payload]
 */
export async function invokeFunction(name, payload = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) throw error;
  return data;
}
