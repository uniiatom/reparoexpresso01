import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { serviceRequestId, finalAmount, couponCode, originalPrice } = await req.json();
    if (!serviceRequestId || !finalAmount || !originalPrice) {
      return jsonResponse({ error: 'Dados incompletos' }, 400);
    }

    const totalDiscount = originalPrice - finalAmount;
    const bonusAmount = totalDiscount > originalPrice ? totalDiscount - originalPrice : 0;

    if (bonusAmount <= 0) {
      return jsonResponse({ success: true, bonusGenerated: false, message: 'Sem excedente de cupom' });
    }

    const supabase = getServiceClient();
    const { data: wallets } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', user.id)
      .eq('owner_type', 'cliente')
      .limit(1);

    let wallet = wallets?.[0];
    if (!wallet) {
      const { data: created, error } = await supabase
        .from('wallets')
        .insert({
          owner_id: user.id,
          owner_type: 'cliente',
          owner_name: user.full_name,
          owner_email: user.email,
          balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      wallet = created;
    }

    const { data: bonus, error: bErr } = await supabase
      .from('wallet_bonuses')
      .insert({
        wallet_id: wallet.id,
        owner_id: user.id,
        owner_name: user.full_name,
        amount: bonusAmount,
        reason: 'coupon_excess',
        related_coupon_code: couponCode || null,
        related_service_request_id: serviceRequestId,
        is_used: false,
        validation_status: 'validated',
      })
      .select()
      .single();

    if (bErr) throw bErr;

    if (couponCode) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/incrementCouponUsage`, {
          method: 'POST',
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ couponCode }),
        });
      } catch { /* noop */ }
    }

    return jsonResponse({
      success: true,
      bonusGenerated: true,
      bonusAmount,
      bonusId: bonus.id,
      message: `Bônus de R$ ${bonusAmount.toFixed(2)} será adicionado à sua carteira!`,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
