import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { serviceRequestId, providerPJId } = await req.json();

    if (!serviceRequestId || !providerPJId) {
      return Response.json({ error: 'Missing serviceRequestId or providerPJId' }, { status: 400 });
    }

    // Busca o serviço
    const service = await base44.entities.ServiceRequest.get(serviceRequestId);
    if (!service) {
      return Response.json({ error: 'Service not found' }, { status: 404 });
    }

    // Valida se é PJ (busca Provider com tipo PJ ou similar)
    const provider = await base44.entities.Provider.get(providerPJId);
    if (!provider) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    const finalPrice = service.final_price || service.estimated_price || 0;
    if (finalPrice <= 0) {
      return Response.json({ error: 'No valid price for service' }, { status: 400 });
    }

    // Busca bônus/cashback do prestador para este serviço
    const cashbacks = await base44.asServiceRole.entities.Cashback.filter({
      service_request_id: service.id,
      owner_id: providerPJId,
      owner_type: 'prestador',
    });
    const totalCashback = cashbacks.reduce((sum, cb) => sum + (cb.cashback_amount || 0), 0);

    // Calcula retenção: 3% do valor líquido do prestador + bônus
    const baseValue = finalPrice + totalCashback;
    const retentionAmount = baseValue * 0.03;
    const blockedUntilDate = new Date();
    blockedUntilDate.setMonth(blockedUntilDate.getMonth() + 3);

    // Busca ou cria fundo de reserva do prestador
    let reserveFund = (await base44.entities.ReserveFund.filter({ provider_id: providerPJId }))[0];
    
    if (!reserveFund) {
      // Cria novo fundo
      const created = await base44.asServiceRole.entities.ReserveFund.create({
        provider_id: providerPJId,
        provider_name: provider.name,
        total_accumulated: retentionAmount,
        blocked_amount: retentionAmount,
        available_amount: 0,
        last_service_date: new Date().toISOString(),
        status: 'ativo',
      });
      reserveFund = created;
    } else {
      // Atualiza fundo existente
      const updated = await base44.asServiceRole.entities.ReserveFund.update(reserveFund.id, {
        total_accumulated: (reserveFund.total_accumulated || 0) + retentionAmount,
        blocked_amount: (reserveFund.blocked_amount || 0) + retentionAmount,
        last_service_date: new Date().toISOString(),
      });
      reserveFund = updated;
    }

    // Cria transação de retenção
    await base44.asServiceRole.entities.ReserveFundTransaction.create({
      reserve_fund_id: reserveFund.id,
      provider_id: providerPJId,
      service_request_id: serviceRequestId,
      type: 'retencao',
      amount: retentionAmount,
      service_value: finalPrice,
      retention_percentage: 3,
      blocked_until: blockedUntilDate.toISOString(),
      reason: `Retenção de 3% do serviço ${service.service_number || serviceRequestId} (valor: R$ ${finalPrice.toFixed(2)} + bônus: R$ ${totalCashback.toFixed(2)})`,
      status: 'confirmada',
    });

    console.log(`[ReserveFund] Retention of R$ ${retentionAmount.toFixed(2)} created for provider ${providerPJId}`);

    return Response.json({
      success: true,
      reserveFundId: reserveFund.id,
      retentionAmount,
      blockedUntil: blockedUntilDate.toISOString(),
    });
  } catch (error) {
    console.error('[ReserveFund Error]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});