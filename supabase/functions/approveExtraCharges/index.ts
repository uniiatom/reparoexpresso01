import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { service_id, provider_id, client_name, extra_charges_total, new_total } = await req.json();
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
          status: 'approved',
          approved_at: new Date().toISOString(),
        },
        final_price: new_total,
        estimated_price: new_total,
      })
      .eq('id', service_id);

    if (provider_id) {
      await supabase.from('provider_notifications').insert({
        provider_id,
        type: 'extra_charges_approved',
        title: 'Orçamento Extra Aprovado',
        message: `${client_name} aprovou o extra de R$ ${Number(extra_charges_total).toFixed(2)} para ${service.service_number}`,
        service_id,
        is_read: false,
      });
    }

    return jsonResponse({ success: true, message: 'Extra charges approved', service_id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
