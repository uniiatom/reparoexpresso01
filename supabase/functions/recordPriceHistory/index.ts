import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const {
      service_id,
      service_number,
      event_type,
      previous_price,
      new_price,
      extra_charges_total,
      reason,
      notes,
      status,
    } = await req.json();

    if (!service_id || !event_type || !new_price) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const actor_type = user.role === 'admin' ? 'provider' : 'client';

    const { data: history, error } = await supabase
      .from('service_price_history')
      .insert({
        service_id,
        service_number: service_number || '',
        event_type,
        actor_type,
        actor_name: user.full_name || user.email,
        previous_price: previous_price || null,
        new_price,
        extra_charges_total: extra_charges_total || null,
        reason: reason || null,
        notes: notes || null,
        status: status || 'pending',
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return jsonResponse({ success: true, history });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
