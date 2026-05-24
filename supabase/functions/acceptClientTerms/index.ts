import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { client_id } = await req.json();
    if (!client_id) return jsonResponse({ error: 'client_id is required' }, 400);

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('id', client_id)
      .maybeSingle();

    if (error) throw error;
    if (!client || client.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden: Cannot accept terms for another client' }, 403);
    }

    const now = new Date().toISOString();
    await supabase.from('clients').update({ terms_accepted_at: now }).eq('id', client_id);

    return jsonResponse({ success: true, accepted_at: now });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
