import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca todos os bônus não utilizados do cliente
    const allBonuses = await base44.entities.WalletBonus.list('-created_date', 50);
    const myPendingBonuses = allBonuses.filter(b => b.owner_id === user.id && !b.is_used);

    console.log(`Cliente ${user.full_name} tem ${myPendingBonuses.length} bônus pendentes`);

    if (myPendingBonuses.length === 0) {
      return Response.json({
        success: true,
        credited: 0,
        message: 'Nenhum bônus pendente encontrado'
      });
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

    let totalBonusAmount = 0;
    const creditedBonuses = [];

    // Credita cada bônus
    for (const bonus of myPendingBonuses) {
      const newBalance = wallet.balance + bonus.amount;
      const newTotalEarned = wallet.total_earned + bonus.amount;

      await base44.entities.Wallet.update(wallet.id, {
        balance: newBalance,
        total_earned: newTotalEarned,
      });

      await base44.entities.WalletTransaction.create({
        wallet_id: wallet.id,
        owner_id: user.id,
        owner_type: 'cliente',
        type: 'bonus',
        amount: bonus.amount,
        balance_after: newBalance,
        description: bonus.related_coupon_code 
          ? `Bônus do cupom ${bonus.related_coupon_code}`
          : `Bônus - ${bonus.reason}`,
        reference_id: bonus.id,
        reference_type: 'bonus',
        status: 'completed',
      });

      await base44.entities.WalletBonus.update(bonus.id, {
        is_used: true,
        used_at: new Date().toISOString(),
      });

      totalBonusAmount += bonus.amount;
      creditedBonuses.push({
        id: bonus.id,
        amount: bonus.amount,
        reason: bonus.reason,
        coupon: bonus.related_coupon_code
      });

      // Atualiza referência da carteira para próximos bônus
      wallet.balance = newBalance;
      wallet.total_earned = newTotalEarned;
    }

    console.log(`✓ R$ ${totalBonusAmount.toFixed(2)} creditado para ${user.full_name}`);

    return Response.json({
      success: true,
      credited: creditedBonuses.length,
      totalAmount: totalBonusAmount,
      bonuses: creditedBonuses,
      message: `R$ ${totalBonusAmount.toFixed(2)} foi adicionado à sua carteira!`
    });

  } catch (error) {
    console.error('Erro ao creditar bônus pendentes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});