import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, isServiceRoleRequest, invokeInternalFunction } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  // Auditoria (ver /MIGRATION.md, Fase 6): nenhum caller encontrado no
  // repo — `approveServiceEstimate` notifica inline, sem passar por aqui.
  // Trava por segurança, já que não há caller externo legítimo hoje.
  if (!isServiceRoleRequest(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const { service_request_id, client_id } = await req.json();
    if (!service_request_id) {
      return jsonResponse({ error: 'service_request_id required' }, 400);
    }

    const supabase = getServiceClient();
    const { data: service } = await supabase
      .from('service_requests')
      .select('*, professions(name), sub_services(name)')
      .eq('id', service_request_id)
      .maybeSingle();

    if (!service) return jsonResponse({ error: 'Serviço não encontrado' }, 404);

    // `client_notifications.client_id` espera `auth.uid()`, mas
    // `service_requests.client_id` agora é `clients.id` — resolve.
    let notifyClientId = client_id as string | undefined;
    if (service.client_id) {
      const { data: clientRow } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', service.client_id)
        .maybeSingle();
      notifyClientId = clientRow?.user_id ?? notifyClientId;
    }

    if (notifyClientId) {
      await supabase.from('client_notifications').insert({
        client_id: notifyClientId,
        client_email: service.client_email || service.created_by || '',
        type: 'estimate_approval',
        title: 'Orçamento aguardando sua aprovação',
        message: `O prestador enviou um orçamento para ${
          service.sub_services?.name ?? service.professions?.name ?? 'o serviço'
        }. Acesse para aprovar ou recusar.`,
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
