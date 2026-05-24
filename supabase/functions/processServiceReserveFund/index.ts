import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { serviceRequestId, providerPJId } = await req.json();
    if (!serviceRequestId || !providerPJId) {
      return jsonResponse({ error: 'Missing serviceRequestId or providerPJId' }, 400);
    }

    const supabase = getServiceClient();
    const { data: service } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', serviceRequestId)
      .maybeSingle();

    if (!service) return jsonResponse({ error: 'Service not found' }, 404);

    const { data: provider } = await supabase
      .from('providers')
      .select('id, name')
      .eq('id', providerPJId)
      .maybeSingle();

    if (!provider) return jsonResponse({ error: 'Provider not found' }, 404);

    const finalPrice = Number(service.final_price || service.estimated_price || 0);
    if (finalPrice <= 0) return jsonResponse({ error: 'No valid price for service' }, 400);

    const { data: cashbacks } = await supabase
      .from('cashbacks')
      .select('cashback_amount')
      .eq('service_request_id', service.id)
      .eq('owner_id', providerPJId)
      .eq('owner_type', 'prestador');

    const totalCashback = (cashbacks ?? []).reduce((sum, cb) => sum + Number(cb.cashback_amount || 0), 0);
    const retentionAmount = (finalPrice + totalCashback) * 0.03;
    const blockedUntilDate = new Date();
    blockedUntilDate.setMonth(blockedUntilDate.getMonth() + 3);

    const { data: existingFunds } = await supabase
      .from('reserve_funds')
      .select('*')
      .eq('provider_id', providerPJId)
      .limit(1);

    let reserveFund = existingFunds?.[0];
    if (!reserveFund) {
      const { data: created, error } = await supabase
        .from('reserve_funds')
        .insert({
          provider_id: providerPJId,
          provider_name: provider.name,
          total_accumulated: retentionAmount,
          blocked_amount: retentionAmount,
          available_amount: 0,
          last_service_date: new Date().toISOString(),
          status: 'ativo',
        })
        .select()
        .single();
      if (error) throw error;
      reserveFund = created;
    } else {
      await supabase.from('reserve_funds').update({
        total_accumulated: Number(reserveFund.total_accumulated || 0) + retentionAmount,
        blocked_amount: Number(reserveFund.blocked_amount || 0) + retentionAmount,
        last_service_date: new Date().toISOString(),
      }).eq('id', reserveFund.id);
    }

    await supabase.from('reserve_fund_transactions').insert({
      reserve_fund_id: reserveFund.id,
      provider_id: providerPJId,
      service_request_id: serviceRequestId,
      type: 'retencao',
      amount: retentionAmount,
      service_value: finalPrice,
      retention_percentage: 3,
      blocked_until: blockedUntilDate.toISOString(),
      reason: `Retenção de 3% do serviço ${service.service_number || serviceRequestId}`,
      status: 'confirmada',
    });

    return jsonResponse({
      success: true,
      reserveFundId: reserveFund.id,
      retentionAmount,
      blockedUntil: blockedUntilDate.toISOString(),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
