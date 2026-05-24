import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { provider_id } = await req.json();
    if (!provider_id) return jsonResponse({ error: 'provider_id is required' }, 400);

    const { data: provider, error } = await supabase
      .from('providers')
      .select('id, user_id')
      .eq('id', provider_id)
      .maybeSingle();

    if (error) throw error;
    if (!provider || provider.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden: Cannot accept terms for another provider' }, 403);
    }

    const now = new Date().toISOString();
    await supabase.from('providers').update({ terms_accepted_at: now }).eq('id', provider_id);

    return jsonResponse({ success: true, accepted_at: now });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
