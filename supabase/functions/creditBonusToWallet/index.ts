import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    await requireUser(req); // auth opcional para automação interna
    const body = await req.json();
    const bonusId = body.bonusId || body.event?.entity_id;
    if (!bonusId) return jsonResponse({ error: 'bonusId é obrigatório' }, 400);

    const supabase = getServiceClient();
    const { data: targetBonus, error: bErr } = await supabase
      .from('wallet_bonuses')
      .select('*')
      .eq('id', bonusId)
      .maybeSingle();

    if (bErr) throw bErr;
    if (!targetBonus) return jsonResponse({ error: 'Bônus não encontrado' }, 404);
    if (targetBonus.is_used) {
      return jsonResponse({ success: false, message: 'Bônus já foi utilizado' });
    }
    if (targetBonus.validation_status && targetBonus.validation_status !== 'validated') {
      return jsonResponse({
        success: false,
        message: 'Bônus ainda não foi validado pelo prestador',
        validation_status: targetBonus.validation_status,
      });
    }

    const { data: wallets } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', targetBonus.owner_id)
      .eq('owner_type', 'cliente')
      .limit(1);

    let wallet = wallets?.[0];
    if (!wallet) {
      const { data: created, error: cErr } = await supabase
        .from('wallets')
        .insert({
          owner_id: targetBonus.owner_id,
          owner_type: 'cliente',
          owner_name: targetBonus.owner_name,
          owner_email: targetBonus.owner_email || '',
          balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        })
        .select()
        .single();
      if (cErr) throw cErr;
      wallet = created;
    }

    const newBalance = wallet.balance + targetBonus.amount;
    await supabase.from('wallets').update({
      balance: newBalance,
      total_earned: (wallet.total_earned || 0) + targetBonus.amount,
    }).eq('id', wallet.id);

    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      owner_id: targetBonus.owner_id,
      owner_type: 'cliente',
      type: 'bonus',
      amount: targetBonus.amount,
      balance_after: newBalance,
      description: `Bônus do cupom ${targetBonus.related_coupon_code || ''}`,
      reference_id: bonusId,
      reference_type: 'bonus',
      status: 'completed',
    });

    await supabase.from('wallet_bonuses').update({
      is_used: true,
      used_at: new Date().toISOString(),
    }).eq('id', bonusId);

    return jsonResponse({
      success: true,
      message: `Bônus de R$ ${Number(targetBonus.amount).toFixed(2)} adicionado à carteira!`,
      newBalance,
      walletId: wallet.id,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
