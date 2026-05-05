import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bonusId, serviceRequestId } = await req.json();

    if (!bonusId || !serviceRequestId) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Busca o bônus
    const bonuses = await base44.asServiceRole.entities.WalletBonus.filter({
      id: bonusId,
      owner_id: user.id
    });

    if (bonuses.length === 0) {
      return Response.json({ error: 'Bônus não encontrado' }, { status: 404 });
    }

    const bonus = bonuses[0];

    if (bonus.is_used) {
      return Response.json({ error: 'Bônus já foi utilizado' }, { status: 400 });
    }

    // Atualiza o bônus como usado
    await base44.asServiceRole.entities.WalletBonus.update(bonusId, {
      is_used: true,
      used_on_service_id: serviceRequestId,
      used_at: new Date().toISOString()
    });

    // Busca o serviço e atualiza com desconto do bônus
    const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
      id: serviceRequestId,
      client_id: user.id
    });

    if (serviceRequests.length > 0) {
      const service = serviceRequests[0];
      const currentDiscount = service.discount_amount || 0;
      const newFinalPrice = Math.max(0, (service.final_price || service.estimated_price || 0) - bonus.amount);

      await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, {
        discount_amount: currentDiscount + bonus.amount,
        final_price: newFinalPrice
      });

      console.log(`Bônus ${bonusId} (R$ ${bonus.amount}) aplicado ao serviço ${serviceRequestId}`);
    }

    return Response.json({
      success: true,
      message: `Bônus de R$ ${bonus.amount.toFixed(2)} aplicado com sucesso!`,
      bonusAmount: bonus.amount
    });

  } catch (error) {
    console.error('Apply bonus error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});