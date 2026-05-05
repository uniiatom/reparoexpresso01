import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceRequestId, finalAmount, couponCode, originalPrice } = await req.json();

    if (!serviceRequestId || !finalAmount || !originalPrice) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Calcula desconto e bônus excedente (cupom vale mais que o serviço)
    const totalDiscount = originalPrice - finalAmount;

    // Se desconto é maior que o preço original, gera bônus para o cliente
    const bonusAmount = totalDiscount > originalPrice ? totalDiscount - originalPrice : 0;

    if (bonusAmount <= 0) {
      console.log(`Sem bônus excedente: desconto R$ ${totalDiscount.toFixed(2)}, preço original R$ ${originalPrice.toFixed(2)}`);
      return Response.json({ 
        success: true, 
        bonusGenerated: false,
        message: 'Sem excedente de cupom' 
      });
    }

    // Busca ou cria carteira do cliente
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      owner_id: user.id,
      owner_type: 'cliente'
    });

    let wallet = wallets[0];
    if (!wallet) {
      wallet = await base44.asServiceRole.entities.Wallet.create({
        owner_id: user.id,
        owner_type: 'cliente',
        owner_name: user.full_name,
        owner_email: user.email,
        balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
        is_active: true
      });
    }

    // Cria bônus (dispara automação creditBonusToWallet)
    const bonus = await base44.asServiceRole.entities.WalletBonus.create({
      wallet_id: wallet.id,
      owner_id: user.id,
      owner_name: user.full_name,
      owner_email: user.email,
      amount: bonusAmount,
      reason: 'coupon_excess',
      related_coupon_code: couponCode || null,
      related_service_request_id: serviceRequestId,
      is_used: false
    });

    console.log(`✓ Bônus de R$ ${bonusAmount.toFixed(2)} criado para ${user.full_name} (será creditado automaticamente)`);

    return Response.json({
      success: true,
      bonusGenerated: true,
      bonusAmount: bonusAmount,
      bonusId: bonus.id,
      message: `Bônus de R$ ${bonusAmount.toFixed(2)} será adicionado à sua carteira!`
    });

  } catch (error) {
    console.error('Coupon bonus processing error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});