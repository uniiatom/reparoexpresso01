import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/internalInvoke.ts';

// Chamada internamente por `completeServiceRequest` quando uma OS é concluída
// (mesma convenção de `updateProviderJobCount`: sem checagem extra de role,
// depende do `verify_jwt` padrão + do fato de só ser invocada com a service key).
Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { request_id } = await req.json();
    if (!request_id) return jsonResponse({ error: 'request_id é obrigatório' }, 400);

    const supabase = getServiceClient();
    const { data: serviceRequest, error: requestError } = await supabase
      .from('service_requests')
      .select('*, professions(name), sub_services(name)')
      .eq('id', request_id)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!serviceRequest) return jsonResponse({ error: 'Serviço não encontrado' }, 404);
    if (serviceRequest.status !== 'concluido') {
      return jsonResponse({ error: 'Serviço não concluído' }, 400);
    }
    if (!serviceRequest.client_id) return jsonResponse({ skipped: true });

    // `customer_loyalty`/`loyalty_transactions.client_id` esperam o
    // `auth.uid()` do cliente (tabelas fora da reestruturação do catálogo),
    // mas `service_requests.client_id` agora é `clients.id`. Resolve antes.
    const { data: clientRow } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', serviceRequest.client_id)
      .maybeSingle();
    const clientUserId = clientRow?.user_id;
    if (!clientUserId) return jsonResponse({ skipped: true });

    const finalPrice = Number(serviceRequest.final_price ?? 0);
    const basePoints = Math.floor(finalPrice);
    if (basePoints <= 0) return jsonResponse({ skipped: true });

    const { data: loyalty } = await supabase
      .from('customer_loyalty')
      .select('*')
      .eq('client_id', clientUserId)
      .maybeSingle();

    let newTotal: number;
    let newAvailable: number;
    let newTier: string;

    if (!loyalty) {
      newTotal = basePoints;
      newAvailable = basePoints;
      newTier = tierFor(newTotal);
      await supabase.from('customer_loyalty').insert({
        client_id: clientUserId,
        total_points: newTotal,
        available_points: newAvailable,
        used_points: 0,
        tier: newTier,
      });
    } else {
      newTotal = (loyalty.total_points ?? 0) + basePoints;
      newAvailable = (loyalty.available_points ?? 0) + basePoints;
      newTier = tierFor(newTotal);
      await supabase
        .from('customer_loyalty')
        .update({ total_points: newTotal, available_points: newAvailable, tier: newTier })
        .eq('client_id', clientUserId);
    }

    await supabase.from('loyalty_transactions').insert({
      client_id: clientUserId,
      type: 'earned',
      points: basePoints,
      description: `Pontos ganhos pelo serviço de ${
        serviceRequest.sub_services?.name ?? serviceRequest.professions?.name ?? 'serviço'
      }`,
      reference_type: 'service_completion',
      balance_after: newAvailable,
    });

    return jsonResponse({ success: true, points_awarded: basePoints, client_tier: newTier, total_points: newTotal });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});

function tierFor(totalPoints: number): string {
  if (totalPoints >= 5000) return 'platinum';
  if (totalPoints >= 2000) return 'gold';
  if (totalPoints >= 500) return 'silver';
  return 'bronze';
}
