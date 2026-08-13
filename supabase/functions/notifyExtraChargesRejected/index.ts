import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { service_id, provider_id } = await req.json();
    if (!service_id || !provider_id) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const supabase = getServiceClient();
    const { data: service } = await supabase
      .from('service_requests')
      .select('service_number, client_name, estimated_price')
      .eq('id', service_id)
      .maybeSingle();

  const { data: provider } = await supabase
      .from('providers')
      .select('email, name')
      .eq('id', provider_id)
      .maybeSingle();

    if (provider) {
      await supabase.from('provider_notifications').insert({
        provider_id,
        provider_email: provider.email,
        type: 'extra_charges_rejected',
        service_id,
        service_number: service?.service_number,
        title: 'Orçamento Extra Rejeitado',
        message: `${service?.client_name} rejeitou o orçamento extra solicitado`,
        is_read: false,
      });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
