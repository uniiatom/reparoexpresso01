import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Busca todos os bônus não utilizados
    const allBonuses = await base44.entities.WalletBonus.list('-created_date', 100);
    const pendingBonuses = allBonuses.filter(b => !b.is_used);

    console.log(`Processando ${pendingBonuses.length} bônus pendentes...`);

    const results = [];

    for (const bonus of pendingBonuses) {
      try {
        // Busca ou cria carteira
        const wallets = await base44.entities.Wallet.filter({
          owner_id: bonus.owner_id,
          owner_type: 'cliente'
        });

        let wallet = wallets[0];
        if (!wallet) {
          wallet = await base44.entities.Wallet.create({
            owner_id: bonus.owner_id,
            owner_type: 'cliente',
            owner_name: bonus.owner_name,
            owner_email: bonus.owner_email || '',
            balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
          });
        }

        // Adiciona saldo à carteira
        const newBalance = wallet.balance + bonus.amount;
        const newTotalEarned = wallet.total_earned + bonus.amount;

        await base44.entities.Wallet.update(wallet.id, {
          balance: newBalance,
          total_earned: newTotalEarned,
        });

        // Cria transação de crédito
        await base44.entities.WalletTransaction.create({
          wallet_id: wallet.id,
          owner_id: bonus.owner_id,
          owner_type: 'cliente',
          type: 'bonus',
          amount: bonus.amount,
          balance_after: newBalance,
          description: `Bônus do cupom ${bonus.related_coupon_code}`,
          reference_id: bonus.id,
          reference_type: 'bonus',
          status: 'completed',
        });

        // Marca bônus como utilizado
        await base44.entities.WalletBonus.update(bonus.id, {
          is_used: true,
          used_at: new Date().toISOString(),
          used_on_service_id: wallet.id,
        });

        results.push({
          success: true,
          bonusId: bonus.id,
          owner: bonus.owner_name,
          amount: bonus.amount,
        });

        console.log(`✓ Bônus ${bonus.id} de R$ ${bonus.amount.toFixed(2)} creditado para ${bonus.owner_name}`);
      } catch (error) {
        console.error(`✗ Erro ao processar bônus ${bonus.id}:`, error.message);
        results.push({
          success: false,
          bonusId: bonus.id,
          error: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      totalProcessed: results.length,
      successCount: results.filter(r => r.success).length,
      results,
    });

  } catch (error) {
    console.error('Erro ao processar bônus pendentes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});