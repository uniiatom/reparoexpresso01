import { supabase } from '@/lib/supabase/client';

/** Compatibilidade com campos legados Base44 (created_date, updated_date). */
export function withLegacyDates(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

export function mapRows(rows) {
  return (rows ?? []).map(withLegacyDates);
}

export function resolveSortColumn(sort) {
  if (!sort) return { column: 'created_at', ascending: false };
  const desc = sort.startsWith('-');
  const raw = desc ? sort.slice(1) : sort;
  const column =
    raw === 'created_date' ? 'created_at' : raw === 'updated_date' ? 'updated_at' : raw;
  return { column, ascending: !desc };
}

function applyFilters(query, filters = {}) {
  let q = query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    q = q.eq(key, value);
  }
  return q;
}

function sanitizePayload(payload, { stripId = false } = {}) {
  const row = { ...payload };
  delete row.created_date;
  delete row.updated_date;
  if (stripId) delete row.id;
  return row;
}

/** Converte evento Realtime do Supabase para formato legado Base44. */
function mapRealtimeEvent(payload) {
  const typeMap = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' };
  const type = typeMap[payload.eventType] ?? String(payload.eventType ?? '').toLowerCase();
  const row = payload.new?.id ? payload.new : payload.old;
  return {
    type,
    id: row?.id ?? payload.new?.id ?? payload.old?.id,
    data: withLegacyDates(row),
  };
}

/**
 * Adaptador genérico compatível com base44.entities.* (list, filter, get, create, update, delete, subscribe).
 * @param {string} table
 * @param {{ realtime?: boolean, defaultSort?: string }} [options]
 */
export function createSupabaseEntityAdapter(table, options = {}) {
  const { realtime = false, defaultSort = '-created_at' } = options;

  return {
    list: async (sort, limit) => {
      const { column, ascending } = resolveSortColumn(
        typeof sort === 'string' ? sort : defaultSort,
      );
      let q = supabase.from(table).select('*').order(column, { ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return mapRows(data);
    },

    filter: async (filters = {}, sort, limit) => {
      const { column, ascending } = resolveSortColumn(
        typeof sort === 'string' ? sort : defaultSort,
      );
      let q = applyFilters(supabase.from(table).select('*'), filters);
      q = q.order(column, { ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return mapRows(data);
    },

    get: async (id) => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return withLegacyDates(data);
    },

    create: async (payload) => {
      const { data, error } = await supabase
        .from(table)
        .insert(sanitizePayload(payload))
        .select()
        .single();
      if (error) throw error;
      return withLegacyDates(data);
    },

    update: async (id, payload) => {
      const { data, error } = await supabase
        .from(table)
        .update(sanitizePayload(payload, { stripId: true }))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return withLegacyDates(data);
    },

    delete: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    subscribe: (callback) => {
      if (!realtime) return () => {};
      const channel = supabase
        .channel(`${table}-realtime-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          callback(mapRealtimeEvent(payload));
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}
