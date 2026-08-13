import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, isServiceRoleRequest } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  // Só chamada internamente (checkExpiringServices, sendEstimateApprovalNotification)
  // via invokeInternalFunction com a service role key — nenhum app cliente
  // chama isso direto.
  if (!isServiceRoleRequest(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const { providerId, title, message, data } = await req.json();
    if (!providerId) return jsonResponse({ error: 'providerId obrigatório' }, 400);

    const supabase = getServiceClient();
    await supabase.from('provider_notifications').insert({
      provider_id: providerId,
      type: data?.type || 'push',
      title: title || 'Novo alerta',
      message: message || '',
      action_url: data?.action_url || null,
    });

    // `providers.push_subscription` não existe em nenhuma versão do schema
    // que encontrei (nem antes, nem depois da reestruturação — ver
    // /MIGRATION.md, seção 0.1) e não há projeto Firebase/APNs configurado
    // (🔒). O envio real de push fica bloqueado; a notificação in-app acima
    // já foi salva, que é o que os apps de fato leem hoje.
    return jsonResponse({ success: true, notification_saved: true, push_skipped: 'push não configurado' });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
