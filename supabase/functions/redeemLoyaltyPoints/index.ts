import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

// Mesmos tiers fixos de `legacy/src/pages/LoyaltyRewards.jsx` (REWARD_TIERS).
const REWARD_TIERS: Record<number, number> = {
  100: 10,
  250: 30,
  500: 70,
  1000: 160,
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { points } = await req.json();
    const discount = REWARD_TIERS[points];
    if (!discount) {
      return jsonResponse({ error: 'Recompensa inválida' }, 400);
    }

    const { data: loyalty, error: loyaltyError } = await supabase
      .from('customer_loyalty')
      .select('*')
      .eq('client_id', user.id)
      .maybeSingle();

    if (loyaltyError) throw loyaltyError;
    if (!loyalty || (loyalty.available_points ?? 0) < points) {
      return jsonResponse({ error: 'Pontos insuficientes' }, 400);
    }

    const newAvailable = (loyalty.available_points ?? 0) - points;
    const newUsed = (loyalty.used_points ?? 0) + points;

    await supabase
      .from('customer_loyalty')
      .update({ available_points: newAvailable, used_points: newUsed })
      .eq('client_id', user.id);

    await supabase.from('loyalty_transactions').insert({
      client_id: user.id,
      type: 'used',
      points,
      description: `Resgate de R$ ${discount} de desconto`,
      reference_type: 'payment',
      balance_after: newAvailable,
    });

    return jsonResponse({
      success: true,
      discount_value: discount,
      remaining_points: newAvailable,
      message: `Resgate de R$ ${discount} de desconto confirmado`,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
