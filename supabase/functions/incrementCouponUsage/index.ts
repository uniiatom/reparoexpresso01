import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { couponCode } = await req.json();
    if (!couponCode) return jsonResponse({ error: 'Código do cupom é obrigatório' }, 400);

    const supabase = getServiceClient();
    const code = String(couponCode).toUpperCase();
    const { data: coupons, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .limit(1);

    if (fetchError) throw fetchError;
    if (!coupons?.length) return jsonResponse({ error: 'Cupom não encontrado' }, 404);

    const coupon = coupons[0];
    const newUses = (coupon.current_uses || 0) + 1;

    const { error: updateError } = await supabase
      .from('coupons')
      .update({ current_uses: newUses })
      .eq('id', coupon.id);

    if (updateError) throw updateError;

    return jsonResponse({ success: true, new_uses: newUses });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
