import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/internalInvoke.ts';
import { invokeInternalFunction } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { service_request_id, client_id } = await req.json();
    if (!service_request_id) {
      return jsonResponse({ error: 'service_request_id required' }, 400);
    }

    const supabase = getServiceClient();
    const { data: service } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', service_request_id)
      .maybeSingle();

    if (!service) return jsonResponse({ error: 'Serviço não encontrado' }, 404);

    if (service.client_id || client_id) {
      await supabase.from('client_notifications').insert({
        client_id: service.client_id || client_id,
        client_email: service.client_email || service.created_by || '',
        type: 'estimate_approval',
        title: 'Orçamento aguardando sua aprovação',
        message: `O prestador enviou um orçamento para ${service.service_type}. Acesse para aprovar ou recusar.`,
        action_url: `/acompanhar/${service_request_id}`,
      });
    }

    if (service.provider_id) {
      await invokeInternalFunction('sendPushNotification', {
        providerId: service.provider_id,
        title: 'Orçamento enviado',
        message: 'Aguardando aprovação do cliente.',
        data: { service_id: service_request_id, type: 'estimate_sent' },
      });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
