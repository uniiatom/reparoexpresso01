import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, invokeInternalFunction } from '../_shared/internalInvoke.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { serviceRequestId } = await req.json();
    if (!serviceRequestId) {
      return jsonResponse({ error: 'Service request ID é obrigatório' }, 400);
    }

    const { data: providers } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const provider = providers?.[0];
    if (!provider) return jsonResponse({ error: 'Prestador não encontrado' }, 404);

    const serviceClient = getServiceClient();
    const { data: service } = await serviceClient
      .from('service_requests')
      .select('*')
      .eq('id', serviceRequestId)
      .maybeSingle();

    if (!service) return jsonResponse({ error: 'Serviço não encontrado' }, 404);
    if (service.provider_id !== provider.id) {
      return jsonResponse({ error: 'Apenas o prestador responsável pode confirmar' }, 403);
    }
    if (service.status !== 'concluido') {
      return jsonResponse({ error: 'Serviço precisa estar concluído primeiro' }, 400);
    }

    const { data: bonuses } = await serviceClient
      .from('wallet_bonuses')
      .select('*')
      .eq('related_service_request_id', serviceRequestId)
      .eq('validation_status', 'pending_provider_confirmation');

    if (!bonuses?.length) {
      return jsonResponse({ success: true, message: 'Nenhum bônus pendente de validação para este serviço' });
    }

    const now = new Date().toISOString();
    for (const bonus of bonuses) {
      await serviceClient.from('wallet_bonuses').update({
        validation_status: 'validated',
        validated_by: user.email,
        validated_at: now,
      }).eq('id', bonus.id);

      await invokeInternalFunction('creditBonusToWallet', { bonusId: bonus.id });
    }

    return jsonResponse({
      success: true,
      bonusesValidated: bonuses.length,
      totalAmount: bonuses.reduce((sum, b) => sum + Number(b.amount || 0), 0),
      message: `${bonuses.length} bônus creditado(s) com sucesso!`,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
