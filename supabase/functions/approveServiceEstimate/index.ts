import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { request_id, approved, notes = '' } = await req.json();
    if (!request_id) return jsonResponse({ error: 'request_id é obrigatório' }, 400);

    const supabase = getServiceClient();
    const { data: services, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', request_id)
      .limit(1);

    if (error) throw error;
    if (!services?.length) return jsonResponse({ error: 'Serviço não encontrado' }, 404);

    const service = services[0];
    if (service.created_by !== user.email) {
      return jsonResponse({ error: 'Você não tem permissão para aprovar este serviço' }, 403);
    }

    // Não existe coluna pra approval_notes/approved_at/approved_by em
    // service_requests (ver MIGRATION.md seção 0.1) — só o status é
    // persistido. `notes` segue no corpo da notificação abaixo.
    const newStatus = approved ? 'aceito' : 'cancelado';
    await supabase
      .from('service_requests')
      .update({ status: newStatus })
      .eq('id', request_id);

    if (service.provider_id) {
      await supabase.from('provider_notifications').insert({
        provider_id: service.provider_id,
        type: approved ? 'estimate_approved' : 'estimate_rejected',
        title: approved ? 'Orçamento Aprovado!' : 'Orçamento Recusado',
        message: approved
          ? `Cliente ${service.client_name} aprovou o orçamento de R$ ${(service.estimated_price || 0).toFixed(2)}`
          : `Cliente ${service.client_name} recusou o orçamento${notes ? `: ${notes}` : ''}`,
        service_id: request_id,
        is_read: false,
      });
    }

    return jsonResponse({
      success: true,
      status: newStatus,
      message: approved ? 'Orçamento aprovado com sucesso!' : 'Orçamento recusado',
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
