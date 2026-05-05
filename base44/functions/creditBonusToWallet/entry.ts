import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bonusId } = await req.json();

    if (!bonusId) {
      return Response.json({ error: 'bonusId é obrigatório' }, { status: 400 });
    }

    // Busca o bônus
    const bonus = await base44.entities.WalletBonus.list();
    const targetBonus = bonus.find(b => b.id === bonusId);

    if (!targetBonus) {
      return Response.json({ error: 'Bônus não encontrado' }, { status: 404 });
    }

    if (targetBonus.is_used) {
      return Response.json({ error: 'Bônus já foi utilizado' }, { status: 400 });
    }

    // Busca ou cria carteira
    const wallets = await base44.entities.Wallet.filter({
      owner_id: user.id,
      owner_type: 'cliente'
    });

    let wallet = wallets[0];
    if (!wallet) {
      wallet = await base44.entities.Wallet.create({
        owner_id: user.id,
        owner_type: 'cliente',
        owner_name: user.full_name,
        owner_email: user.email,
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

    console.log(`Bônus de R$ ${targetBonus.amount.toFixed(2)} creditado à carteira do cliente ${user.full_name}`);

    return Response.json({
      success: true,
      message: `Bônus de R$ ${targetBonus.amount.toFixed(2)} adicionado à sua carteira!`,
      newBalance,
    });

  } catch (error) {
    console.error('Erro ao creditar bônus:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});