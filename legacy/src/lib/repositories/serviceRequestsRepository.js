import { supabase } from '@/lib/supabase/client';

const ACTIVE_STATUSES = ['aguardando', 'aceito', 'a_caminho', 'em_andamento', 'em_espera', 'agendado'];

/**
 * Lista OS do cliente autenticado (via RLS).
 * @returns {Promise<Array>}
 */
export async function listMyActiveServiceRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).filter((row) => ACTIVE_STATUSES.includes(row.status));
}

/**
 * Lista todas as OS do cliente (histórico curto).
 */
export async function listMyServiceRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Cria rascunho de OS (fluxo mínimo sem Base44).
 * @param {{ serviceType: string, notes?: string }} input
 */
export async function createDraftServiceRequest({ serviceType, notes = null }) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      client_id: uid,
      service_type: serviceType,
      status: 'aguardando',
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Inscreve mudanças em service_requests do usuário atual (Realtime).
 * @param {(payload: import('@supabase/supabase-js').RealtimePostgresChangesPayload<'*'>) => void} callback
 * @returns {Promise<() => void>} função para remover canal
 */
export async function subscribeMyServiceRequests(callback) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return () => {};

  const channel = supabase
    .channel(`service_requests:${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_requests',
        filter: `client_id=eq.${uid}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
