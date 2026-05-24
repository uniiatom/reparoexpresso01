import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { walletId, amount, pixKey, pixKeyType } = await req.json();
    if (!walletId || !amount || !pixKey) {
      return jsonResponse({ success: false, message: 'Dados incompletos' }, 400);
    }
    if (amount < 50) {
      return jsonResponse({ success: false, message: 'Valor mínimo para saque é R$ 50,00' }, 400);
    }

    const { data: wallets, error: wErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('owner_id', user.id)
      .limit(1);

    if (wErr) throw wErr;
    if (!wallets?.length) return jsonResponse({ success: false, message: 'Carteira não encontrada' }, 404);

    const wallet = wallets[0];
    if (wallet.balance < amount) {
      return jsonResponse({ success: false, message: 'Saldo insuficiente' }, 400);
    }

    const newBalance = wallet.balance - amount;

    await supabase.from('wallets').update({
      balance: newBalance,
      total_withdrawn: (wallet.total_withdrawn || 0) + amount,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
    }).eq('id', wallet.id);

    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      owner_id: user.id,
      owner_type: wallet.owner_type,
      type: 'withdrawal',
      amount,
      balance_after: newBalance,
      description: `Saque PIX (${pixKeyType}: ${pixKey})`,
      reference_type: 'withdrawal',
      status: 'pending',
      pix_key: pixKey,
    });

    return jsonResponse({
      success: true,
      message: 'Saque solicitado! Será processado em até 2 dias úteis.',
      new_balance: newBalance,
    });
  } catch (error) {
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
