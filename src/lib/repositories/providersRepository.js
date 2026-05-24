import { supabase } from '@/lib/supabase/client';

/** Compatibilidade com campos legados Base44 (created_date, etc.) */
function withLegacyDates(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

function mapRows(rows) {
  return (rows ?? []).map(withLegacyDates);
}

function resolveSortColumn(sort) {
  if (!sort) return { column: 'created_at', ascending: false };
  const desc = sort.startsWith('-');
  const raw = desc ? sort.slice(1) : sort;
  const column = raw === 'created_date' ? 'created_at' : raw === 'updated_date' ? 'updated_at' : raw;
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

// ─── Provider ───────────────────────────────────────────────

export async function listProviders(sort) {
  const { column, ascending } = resolveSortColumn(typeof sort === 'string' ? sort : '-created_at');
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .order(column, { ascending });
  if (error) throw error;
  return mapRows(data);
}

export async function filterProviders(filters = {}, sort, limit) {
  const { column, ascending } = resolveSortColumn(typeof sort === 'string' ? sort : undefined);
  let q = applyFilters(supabase.from('providers').select('*'), filters);
  q = q.order(column, { ascending });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return mapRows(data);
}

export async function getProvider(id) {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return withLegacyDates(data);
}

export async function createProvider(payload) {
  const row = { ...payload };
  delete row.created_date;
  delete row.updated_date;
  const { data, error } = await supabase
    .from('providers')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

export async function updateProvider(id, payload) {
  const row = { ...payload };
  delete row.created_date;
  delete row.updated_date;
  delete row.id;
  const { data, error } = await supabase
    .from('providers')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

export function subscribeProviders(callback) {
  const channel = supabase
    .channel('providers-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'providers' },
      callback,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── ProviderAvailability ───────────────────────────────────

export async function filterProviderAvailability(filters = {}) {
  let q = applyFilters(supabase.from('provider_availability').select('*'), filters);
  const { data, error } = await q;
  if (error) throw error;
  return mapRows(data);
}

export async function createProviderAvailability(payload) {
  const { data, error } = await supabase
    .from('provider_availability')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

export async function updateProviderAvailability(id, payload) {
  const { data, error } = await supabase
    .from('provider_availability')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

export async function deleteProviderAvailability(id) {
  const { error } = await supabase.from('provider_availability').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

// ─── ProviderUnavailability ─────────────────────────────────

export async function filterProviderUnavailability(filters = {}) {
  let q = applyFilters(supabase.from('provider_unavailability').select('*'), filters);
  const { data, error } = await q;
  if (error) throw error;
  return mapRows(data);
}

export async function listProviderUnavailability() {
  const { data, error } = await supabase.from('provider_unavailability').select('*');
  if (error) throw error;
  return mapRows(data);
}

export async function createProviderUnavailability(payload) {
  const { data, error } = await supabase
    .from('provider_unavailability')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

export async function deleteProviderUnavailability(id) {
  const { error } = await supabase.from('provider_unavailability').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

// ─── ProviderConfig ─────────────────────────────────────────

const PROVIDER_CONFIG_WRITABLE_KEYS = [
  'required_fields',
  'allowed_services',
  'allowed_weekdays',
  'allowed_hours_start',
  'allowed_hours_end',
  'allowed_regions',
  'allowed_day_schedules',
  'custom_registration_fields',
];

/** Remove campos legados Base44 e colunas somente leitura antes do insert/update. */
export function sanitizeProviderConfigPayload(payload = {}) {
  const clean = {};
  for (const key of PROVIDER_CONFIG_WRITABLE_KEYS) {
    if (payload[key] !== undefined) clean[key] = payload[key];
  }
  return clean;
}

export async function listProviderConfig() {
  const { data, error } = await supabase.from('provider_config').select('*').limit(1);
  if (error) throw error;
  return mapRows(data);
}

export async function createProviderConfig(payload) {
  const row = sanitizeProviderConfigPayload(payload);
  const { data, error } = await supabase
    .from('provider_config')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

export async function updateProviderConfig(id, payload) {
  const row = sanitizeProviderConfigPayload(payload);
  const { data, error } = await supabase
    .from('provider_config')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

// ─── Qualifications ─────────────────────────────────────────

export async function listQualifications() {
  const { data, error } = await supabase.from('qualifications').select('*').order('name');
  if (error) throw error;
  return mapRows(data);
}

export async function createQualification(payload) {
  const { data, error } = await supabase
    .from('qualifications')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return withLegacyDates(data);
}

export async function deleteQualification(id) {
  const { error } = await supabase.from('qualifications').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

/**
 * Adaptador compatível com base44.entities.* para prestadores.
 * Permite migrar o front sem alterar dezenas de arquivos de uma vez.
 */
export function createProviderEntityAdapters() {
  return {
    Provider: {
      list: (sort) => listProviders(sort),
      filter: (filters, sort, limit) => filterProviders(filters ?? {}, sort, limit),
      get: (id) => getProvider(id),
      create: (payload) => createProvider(payload),
      update: (id, payload) => updateProvider(id, payload),
      subscribe: (callback) => subscribeProviders(callback),
    },
    ProviderAvailability: {
      filter: (filters) => filterProviderAvailability(filters ?? {}),
      create: (payload) => createProviderAvailability(payload),
      update: (id, payload) => updateProviderAvailability(id, payload),
      delete: (id) => deleteProviderAvailability(id),
    },
    ProviderUnavailability: {
      list: () => listProviderUnavailability(),
      filter: (filters) => filterProviderUnavailability(filters ?? {}),
      create: (payload) => createProviderUnavailability(payload),
      delete: (id) => deleteProviderUnavailability(id),
    },
    ProviderConfig: {
      list: () => listProviderConfig(),
      create: (payload) => createProviderConfig(payload),
      update: (id, payload) => updateProviderConfig(id, payload),
    },
    Qualification: {
      list: () => listQualifications(),
      create: (payload) => createQualification(payload),
      delete: (id) => deleteQualification(id),
    },
  };
}
