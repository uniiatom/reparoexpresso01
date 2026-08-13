import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { invokeInternalFunction } from '../_shared/internalInvoke.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';
Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { service_request_id, completion_type, reason } = await req.json();
    if (!service_request_id || !completion_type) {
      return jsonResponse({ error: 'Dados incompletos' }, 400);
    }

    const supabase = getServiceClient();

    const { data: serviceRequest, error: serviceError } = await supabase
      .from('service_requests')
      .select('*, professions(name, slug), sub_services(name, slug)')
      .eq('id', service_request_id)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!serviceRequest) return jsonResponse({ error: 'Serviço não encontrado' }, 404);

    const { data: providers } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const provider = providers?.[0];
    if (!provider) return jsonResponse({ error: 'Prestador não encontrado' }, 404);
    if (serviceRequest.provider_id !== provider.id) {
      return jsonResponse({ error: 'Acesso negado' }, 403);
    }

    const completionRecord = {
      type: completion_type,
      reason: reason || null,
      completed_at: new Date().toISOString(),
    };

    let newStatus = 'concluido';
    let notificationMessage = '';
    let notificationType = 'service_completed';

    switch (completion_type) {
      case 'success':
        notificationMessage = 'Seu serviço foi concluído com sucesso!';
        break;
      case 'unsuccessful':
        notificationMessage = `Serviço concluído, mas não foi bem-sucedido. Motivo: ${reason}`;
        notificationType = 'warning';
        break;
      case 'not_service_type':
        newStatus = 'cancelado';
        notificationMessage = `O prestador informou que não realiza esse tipo de serviço. Motivo: ${reason}`;
        notificationType = 'warning';
        break;
      case 'needs_return':
        newStatus = 'em_espera';
        notificationMessage = `Necessário um retorno para completar o serviço. Detalhes: ${reason}`;
        notificationType = 'warning';
        break;
    }

    await supabase
      .from('service_requests')
      .update({
        status: newStatus,
        decline_reason: JSON.stringify(completionRecord),
      })
      .eq('id', service_request_id);

    const serviceLabel = serviceRequest.sub_services?.name ?? serviceRequest.professions?.name ?? 'Serviço';

    if (newStatus === 'concluido') {
      const warrantyDays = serviceRequest.sub_services?.slug === 'desentupimento' ? 15 : 90;
      const warrantyEndDate = new Date();
      warrantyEndDate.setDate(warrantyEndDate.getDate() + warrantyDays);

      await supabase
        .from('service_requests')
        .update({
          warranty_end_date: warrantyEndDate.toISOString(),
          warranty_status: 'ativa',
        })
        .eq('id', service_request_id);
    }

    if (serviceRequest.client_id) {
      // `client_notifications.client_id` ainda espera o `auth.uid()` do
      // cliente (tabela não faz parte da reestruturação do catálogo/schema
      // novo) — mas `service_requests.client_id` agora é `clients.id`.
      // Resolve o `user_id` antes de gravar a notificação.
      const { data: clientRow } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', serviceRequest.client_id)
        .maybeSingle();

      if (clientRow?.user_id) {
        await supabase.from('client_notifications').insert({
          client_id: clientRow.user_id,
          client_email: serviceRequest.created_by,
          type: notificationType,
          title: completion_type === 'success' ? 'Serviço Concluído' : 'Atualização no Serviço',
          message: notificationMessage,
          action_url: `/acompanhar/${service_request_id}`,
        });
      }
    }

    await supabase.from('admin_activity_logs').insert({
      action: 'service_completed',
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      entity_type: 'ServiceRequest',
      entity_id: service_request_id,
      entity_label: `${serviceLabel} - ${serviceRequest.client_name}`,
      old_value: serviceRequest.status,
      new_value: newStatus,
      details: `Conclusão: ${completion_type}${reason ? ` - Motivo: ${reason}` : ''}`,
    });

    if (newStatus === 'concluido') {
      await invokeInternalFunction('updateProviderJobCount', {
        data: { ...serviceRequest, status: newStatus, provider_id: provider.id },
        old_status: serviceRequest.status,
      });
      await invokeInternalFunction('awardLoyaltyPoints', { request_id: service_request_id });
    }

    return jsonResponse({      success: true,
      message: `Serviço marcado como ${completion_type}`,
      new_status: newStatus,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
