import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Função para resgatar pontos e gerar código de desconto
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { points } = await req.json();

    // Validar quantia de pontos
    if (!points || points < 100) {
      return Response.json({ error: 'Minimum 100 points required' }, { status: 400 });
    }

    // Buscar fidelidade do cliente
    const loyaltyList = await base44.entities.CustomerLoyalty.filter({
      client_id: user.id,
    });

    const loyalty = loyaltyList[0];

    if (!loyalty || (loyalty.available_points || 0) < points) {
      return Response.json({ error: 'Insufficient points' }, { status: 400 });
    }

    // Calcular desconto: 1 ponto = R$ 0,10
    const discountValue = Math.floor(points * 0.1);

    const newAvailable = (loyalty.available_points || 0) - points;
    const newUsed = (loyalty.used_points || 0) + points;

    // Atualizar fidelidade
    await base44.entities.CustomerLoyalty.update(loyalty.id, {
      available_points: newAvailable,
      used_points: newUsed,
    });

    // Registrar transação
    await base44.entities.LoyaltyTransaction.create({
      client_id: user.id,
      type: 'used',
      points,
      description: `Resgate de R$ ${discountValue} em desconto`,
      reference_type: 'payment',
      balance_after: newAvailable,
    });

    // Gerar código de desconto (formato simples)
    const discountCode = `LOYALTY${Date.now().toString().slice(-6).toUpperCase()}`;

    console.log(`Redeemed ${points} points for discount code ${discountCode}`);

    return Response.json({
      success: true,
      discount_code: discountCode,
      discount_value: discountValue,
      remaining_points: newAvailable,
      message: `Código de desconto gerado: ${discountCode} (R$ ${discountValue})`,
    });
  } catch (error) {
    console.error('Error in redeemLoyaltyPoints:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});