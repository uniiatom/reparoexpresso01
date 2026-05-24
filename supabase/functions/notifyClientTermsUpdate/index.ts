import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden: admin only' }, 403);
    }

    const { client_ids, message } = await req.json();
    if (!Array.isArray(client_ids) || !client_ids.length) {
      return jsonResponse({ error: 'client_ids array required' }, 400);
    }

    const service = getServiceClient();
    const notifications = client_ids.map((clientId: string) => ({
      client_id: clientId,
      type: 'terms_update',
      title: 'Atualização dos Termos de Uso',
      message: message || 'Os termos de uso foram atualizados. Por favor, aceite novamente.',
      is_read: false,
    }));

    const { error } = await service.from('client_notifications').insert(notifications);
    if (error) throw error;

    return jsonResponse({ success: true, notified: client_ids.length });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
