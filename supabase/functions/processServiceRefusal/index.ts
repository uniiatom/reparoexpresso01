import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { service_request_id, provider_id, reasons, description, photos } = await req.json();

    if (!service_request_id || !provider_id || !reasons?.length || !description?.trim() || !photos?.length) {
      return jsonResponse({ error: 'Dados incompletos' }, 400);
    }

    const supabase = getServiceClient();
    const { data: serviceRequest, error: sErr } = await supabase
      .from('service_requests')
      .select('*, professions(name), sub_services(name)')
      .eq('id', service_request_id)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!serviceRequest) {
      return jsonResponse({ error: 'Serviço não encontrado' }, 404);
    }
    if (serviceRequest.provider_id !== provider_id) {
      return jsonResponse({ error: 'Acesso negado' }, 403);
    }

    const clientId = serviceRequest.client_id;
    const declineReason = JSON.stringify({
      type: 'technical_refusal',
      reasons,
      description,
      photos,
      refused_by_provider_id: provider_id,
      timestamp: new Date().toISOString(),
    });

    await supabase.from('service_requests').update({
      status: 'aguardando',
      provider_id: null,
      provider_name: null,
      provider_phone: null,
      estimated_arrival_minutes: null,
      decline_reason: declineReason,
    }).eq('id', service_request_id);

    await supabase.from('admin_activity_logs').insert({
      action: 'service_refused',
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      entity_type: 'ServiceRequest',
      entity_id: service_request_id,
      entity_label: `${serviceRequest.sub_services?.name ?? serviceRequest.professions?.name ?? 'Serviço'} - ${serviceRequest.client_name}`,
      old_value: serviceRequest.status,
      new_value: 'aguardando',
      details: `Recusa técnica justificada. Motivos: ${reasons.join(', ')}. Descrição: ${description}.`,
    });

    if (clientId) {
      // `clients` não tem coluna `email` (fica em auth.users/profiles, ver
      // MIGRATION.md seção 0.1) — `created_by` já guarda o e-mail do cliente
      // que abriu a OS (mesmo padrão usado em sendExtraChargesRequest).
      await supabase.from('client_notifications').insert({
        client_id: clientId,
        client_email: serviceRequest.created_by || '',
        type: 'warning',
        title: 'Buscando novo prestador',
        message: `O prestador não pôde executar o serviço no local (${reasons.join(', ')}). Estamos buscando outro profissional para você automaticamente.`,
        action_url: `/acompanhar/${service_request_id}`,
      });
    }

    return jsonResponse({
      success: true,
      message: 'Recusa registrada. Serviço voltou para a fila de busca.',
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
