import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Handle both manual API calls and automation triggers
    const body = await req.json();
    const bonusId = body.bonusId || body.event?.entity_id;
    const isAutomation = !!body.event;

    if (!bonusId) {
      return Response.json({ error: 'bonusId é obrigatório' }, { status: 400 });
    }

    // Busca o bônus pelo ID direto
    const allBonuses = await base44.entities.WalletBonus.list('-created_date', 100);
    const targetBonus = allBonuses.find(b => b.id === bonusId);

    if (!targetBonus) {
      return Response.json({ error: 'Bônus não encontrado' }, { status: 404 });
    }

    if (targetBonus.is_used) {
      console.log(`Bônus ${bonusId} já foi utilizado, pulando...`);
      return Response.json({ success: false, message: 'Bônus já foi utilizado' }, { status: 200 });
    }

    // Busca ou cria carteira do cliente
    const wallets = await base44.entities.Wallet.filter({
      owner_id: targetBonus.owner_id,
      owner_type: 'cliente'
    });

    let wallet = wallets[0];
    if (!wallet) {
      wallet = await base44.entities.Wallet.create({
        owner_id: targetBonus.owner_id,
        owner_type: 'cliente',
        owner_name: targetBonus.owner_name,
        owner_email: targetBonus.owner_email || '',
        balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
      });
    }

    // Adiciona saldo à carteira
    const newBalance = wallet.balance + targetBonus.amount;
    const newTotalEarned = wallet.total_earned + targetBonus.amount;

    await base44.entities.Wallet.update(wallet.id, {
      balance: newBalance,
      total_earned: newTotalEarned,
    });

    // Cria transação de crédito
    await base44.entities.WalletTransaction.create({
      wallet_id: wallet.id,
      owner_id: user.id,
      owner_type: 'cliente',
      type: 'bonus',
      amount: targetBonus.amount,
      balance_after: newBalance,
      description: `Bônus do cupom ${targetBonus.related_coupon_code}`,
      reference_id: bonusId,
      reference_type: 'bonus',
      status: 'completed',
    });

    // Marca bônus como utilizado
    await base44.entities.WalletBonus.update(bonusId, {
      is_used: true,
      used_at: new Date().toISOString(),
    });

    console.log(`✓ Bônus de R$ ${targetBonus.amount.toFixed(2)} creditado à carteira do cliente ${targetBonus.owner_name}`);

    return Response.json({
      success: true,
      message: `Bônus de R$ ${targetBonus.amount.toFixed(2)} adicionado à carteira!`,
      newBalance,
      walletId: wallet.id,
    });

  } catch (error) {
    console.error('Erro ao creditar bônus:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});