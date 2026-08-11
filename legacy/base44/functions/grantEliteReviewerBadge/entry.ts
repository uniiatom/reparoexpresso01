import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { serviceRequestId, clientId, clientEmail } = await req.json();

    // Verifica se já foi concedido para este serviço (evita duplicatas)
    const existing = await base44.asServiceRole.entities.LoyaltyTransaction.filter({
      client_id: clientId,
      description: `elite_reviewer_${serviceRequestId}`,
    });
    if (existing.length > 0) {
      return Response.json({ already_granted: true });
    }

    // Concede 50 pontos de fidelidade
    const loyaltyList = await base44.asServiceRole.entities.CustomerLoyalty.filter({ client_id: clientId });
    let loyalty = loyaltyList[0];

    if (loyalty) {
      await base44.asServiceRole.entities.CustomerLoyalty.update(loyalty.id, {
        total_points: (loyalty.total_points || 0) + 50,
        available_points: (loyalty.available_points || 0) + 50,
      });
    } else {
      loyalty = await base44.asServiceRole.entities.CustomerLoyalty.create({
        client_id: clientId,
        client_email: clientEmail,
        total_points: 50,
        available_points: 50,
        used_points: 0,
        tier: 'bronze',
      });
    }

    // Registra a transação de fidelidade
    await base44.asServiceRole.entities.LoyaltyTransaction.create({
      client_id: clientId,
      client_email: clientEmail,
      points: 50,
      type: 'earned',
      description: `elite_reviewer_${serviceRequestId}`,
      reason: 'Avaliação detalhada com foto e texto — Badge Avaliador de Elite',
      service_request_id: serviceRequestId,
    });

    // Registra o badge no CustomerLoyalty (campo especial)
    await base44.asServiceRole.entities.CustomerLoyalty.update(loyalty.id, {
      elite_reviewer_badge: true,
      elite_reviewer_granted_at: new Date().toISOString(),
    });

    console.log(`Elite reviewer badge granted to client ${clientId}`);
    return Response.json({ success: true, points_granted: 50, badge: 'elite_reviewer' });
  } catch (error) {
    console.error('grantEliteReviewerBadge error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});