import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { walletId, amount, pixKey, pixKeyType } = await req.json();

    if (!walletId || !amount || !pixKey) {
      return Response.json({ success: false, message: 'Dados incompletos' }, { status: 400 });
    }

    if (amount < 50) {
      return Response.json({ success: false, message: 'Valor mínimo para saque é R$ 50,00' }, { status: 400 });
    }

    // Busca a carteira
    const wallets = await base44.asServiceRole.entities.Wallet.filter({ id: walletId, owner_id: user.id });
    if (wallets.length === 0) {
      return Response.json({ success: false, message: 'Carteira não encontrada' }, { status: 404 });
    }

    const wallet = wallets[0];

    if (wallet.balance < amount) {
      return Response.json({ success: false, message: 'Saldo insuficiente' }, { status: 400 });
    }

    const newBalance = wallet.balance - amount;

    // Atualiza saldo da carteira
    await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      balance: newBalance,
      total_withdrawn: (wallet.total_withdrawn || 0) + amount,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
    });

    // Registra transação
    await base44.asServiceRole.entities.WalletTransaction.create({
      wallet_id: wallet.id,
      owner_id: user.id,
      owner_type: wallet.owner_type,
      type: 'withdrawal',
      amount: amount,
      balance_after: newBalance,
      description: `Saque PIX (${pixKeyType}: ${pixKey})`,
      reference_type: 'withdrawal',
      status: 'pending',
      pix_key: pixKey,
    });

    return Response.json({
      success: true,
      message: 'Saque solicitado! Será processado em até 2 dias úteis.',
      new_balance: newBalance,
    });

  } catch (error) {
    console.error('Wallet withdrawal error:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
});