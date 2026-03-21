import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Função para adicionar pontos quando um serviço é concluído
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { request_id } = await req.json();

    const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: request_id });
    const serviceRequest = requests[0];

    if (!serviceRequest) {
      return Response.json({ error: 'Service request not found' }, { status: 404 });
    }

    if (serviceRequest.status !== 'concluido') {
      return Response.json({ error: 'Service not completed' }, { status: 400 });
    }

    const finalPrice = serviceRequest.final_price || 0;
    const basePoints = Math.floor(finalPrice);

    // Buscar ou criar registro de fidelidade do cliente
    const loyaltyList = await base44.asServiceRole.entities.CustomerLoyalty.filter({
      client_id: serviceRequest.client_id,
    });

    let loyalty = loyaltyList[0];

    if (!loyalty) {
      // Criar novo registro de fidelidade
      loyalty = await base44.asServiceRole.entities.CustomerLoyalty.create({
        client_id: serviceRequest.client_id,
        client_email: serviceRequest.client_name,
        total_points: basePoints,
        available_points: basePoints,
        used_points: 0,
        total_spent: finalPrice,
        total_services: 1,
        tier: 'bronze',
      });
    } else {
      // Atualizar registro existente
      const newTotalPoints = (loyalty.total_points || 0) + basePoints;
      const newAvailablePoints = (loyalty.available_points || 0) + basePoints;
      const newTotalSpent = (loyalty.total_spent || 0) + finalPrice;
      const newTotalServices = (loyalty.total_services || 0) + 1;

      // Determinar novo tier
      let newTier = 'bronze';
      if (newTotalPoints >= 5000) newTier = 'platinum';
      else if (newTotalPoints >= 2000) newTier = 'gold';
      else if (newTotalPoints >= 500) newTier = 'silver';

      loyalty = await base44.asServiceRole.entities.CustomerLoyalty.update(loyalty.id, {
        total_points: newTotalPoints,
        available_points: newAvailablePoints,
        total_spent: newTotalSpent,
        total_services: newTotalServices,
        tier: newTier,
        last_service_date: new Date().toISOString(),
      });
    }

    // Registrar transação de pontos
    await base44.asServiceRole.entities.LoyaltyTransaction.create({
      client_id: serviceRequest.client_id,
      type: 'earned',
      points: basePoints,
      description: `Pontos ganhos pelo serviço de ${serviceRequest.service_type}`,
      request_id: serviceRequest.id,
      service_value: finalPrice,
      reference_type: 'service_completion',
      balance_after: loyalty.available_points,
    });

    console.log(`Awarded ${basePoints} loyalty points to client ${serviceRequest.client_id}`);

    return Response.json({
      success: true,
      points_awarded: basePoints,
      client_tier: loyalty.tier,
      total_points: loyalty.total_points,
    });
  } catch (error) {
    console.error('Error in awardLoyaltyPoints:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});