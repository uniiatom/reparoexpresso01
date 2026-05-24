import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { service_id, provider_id, client_name, rejection_notes } = await req.json();
    const supabase = getServiceClient();

    const { data: service, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', service_id)
      .maybeSingle();

    if (error) throw error;
    if (!service) return jsonResponse({ error: 'Service not found' }, 404);

    await supabase
      .from('service_requests')
      .update({
        extra_charges: {
          ...(service.extra_charges ?? {}),
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_notes,
        },
      })
      .eq('id', service_id);

    if (provider_id) {
      await supabase.from('provider_notifications').insert({
        provider_id,
        type: 'extra_charges_rejected',
        title: 'Orçamento Extra Rejeitado',
        message: `${client_name} rejeitou o orçamento extra: ${rejection_notes}`,
        service_id,
        is_read: false,
      });
    }

    return jsonResponse({ success: true, message: 'Extra charges rejected', service_id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
