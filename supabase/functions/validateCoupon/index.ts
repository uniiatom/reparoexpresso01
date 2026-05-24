import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { couponCode, amount, service_type, provider_id } = await req.json();
    if (!couponCode) {
      return Response.json({ error: 'Código do cupom é obrigatório' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const code = String(couponCode).toUpperCase();
    const { data: coupons, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .limit(1);

    if (couponError) throw couponError;

    if (!coupons?.length) {
      return Response.json({ valid: false, message: 'Cupom não encontrado' }, { status: 400, headers: corsHeaders });
    }

    const coupon = coupons[0];

    if (!coupon.is_active) {
      return Response.json({ valid: false, message: 'Cupom desativado' }, { status: 400, headers: corsHeaders });
    }

    const today = new Date().toISOString().split('T')[0];
    if (coupon.valid_from && today < coupon.valid_from) {
      return Response.json({ valid: false, message: 'Cupom ainda não está válido' }, { status: 400, headers: corsHeaders });
    }
    if (coupon.valid_until && today > coupon.valid_until) {
      return Response.json({ valid: false, message: 'Cupom expirou' }, { status: 400, headers: corsHeaders });
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return Response.json({ valid: false, message: 'Cupom atingiu o limite de usos' }, { status: 400, headers: corsHeaders });
    }

    const userEmail = userData.user.email ?? '';
    const { data: usedServices } = await supabase
      .from('service_requests')
      .select('id')
      .eq('coupon_code', code)
      .eq('created_by', userEmail)
      .limit(1);

    if (usedServices?.length) {
      return Response.json({ valid: false, message: 'Você já usou este cupom' }, { status: 400, headers: corsHeaders });
    }

    if (coupon.min_amount && amount < coupon.min_amount) {
      return Response.json(
        { valid: false, message: `Valor mínimo é R$ ${Number(coupon.min_amount).toFixed(2)}` },
        { status: 400, headers: corsHeaders },
      );
    }

    if (
      coupon.service_types?.length &&
      service_type &&
      !coupon.service_types.includes(service_type)
    ) {
      return Response.json({ valid: false, message: 'Cupom não é válido para este serviço' }, { status: 400, headers: corsHeaders });
    }

    if (
      coupon.applicable_to_providers?.length &&
      provider_id &&
      !coupon.applicable_to_providers.includes(provider_id)
    ) {
      return Response.json({ valid: false, message: 'Cupom não é válido para este prestador' }, { status: 400, headers: corsHeaders });
    }

    let discount_amount = 0;
    if (coupon.discount_type === 'percentage') {
      discount_amount = (amount * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) {
        discount_amount = Math.min(discount_amount, coupon.max_discount_amount);
      }
    } else {
      discount_amount = coupon.discount_value;
    }

    return Response.json(
      {
        valid: true,
        coupon_id: coupon.id,
        coupon_code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount,
        final_amount: Math.max(0, amount - discount_amount),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500, headers: corsHeaders },
    );
  }
});
