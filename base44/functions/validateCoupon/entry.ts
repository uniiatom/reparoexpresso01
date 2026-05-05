import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { couponCode, amount, service_type, provider_id } = await req.json();

    if (!couponCode) {
      return Response.json({ error: 'Código do cupom é obrigatório' }, { status: 400 });
    }

    // Busca o cupom
    const coupons = await base44.entities.Coupon.filter({ code: couponCode.toUpperCase() });
    
    if (coupons.length === 0) {
      return Response.json({ valid: false, message: 'Cupom não encontrado' }, { status: 400 });
    }

    const coupon = coupons[0];

    // Valida se está ativo
    if (!coupon.is_active) {
      return Response.json({ valid: false, message: 'Cupom desativado' }, { status: 400 });
    }

    // Valida datas
    const today = new Date().toISOString().split('T')[0];
    if (coupon.valid_from && today < coupon.valid_from) {
      return Response.json({ valid: false, message: 'Cupom ainda não está válido' }, { status: 400 });
    }
    if (coupon.valid_until && today > coupon.valid_until) {
      return Response.json({ valid: false, message: 'Cupom expirou' }, { status: 400 });
    }

    // Valida número de usos
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return Response.json({ valid: false, message: 'Cupom atingiu o limite de usos' }, { status: 400 });
    }

    // Verifica se o cliente já usou este cupom (máx 1 uso por cliente)
    const userServices = await base44.entities.ServiceRequest.filter({ 
      coupon_code: couponCode.toUpperCase(),
      created_by: user.email
    });
    
    if (userServices.length > 0) {
      return Response.json({ valid: false, message: 'Você já usou este cupom' }, { status: 400 });
    }

    // Valida valor mínimo
    if (coupon.min_amount && amount < coupon.min_amount) {
      return Response.json({ 
        valid: false, 
        message: `Valor mínimo é R$ ${coupon.min_amount.toFixed(2)}` 
      }, { status: 400 });
    }

    // Valida tipos de serviço
    if (coupon.service_types && coupon.service_types.length > 0 && !coupon.service_types.includes(service_type)) {
      return Response.json({ valid: false, message: 'Cupom não é válido para este serviço' }, { status: 400 });
    }

    // Valida prestadores
    if (coupon.applicable_to_providers && coupon.applicable_to_providers.length > 0 && provider_id && !coupon.applicable_to_providers.includes(provider_id)) {
      return Response.json({ valid: false, message: 'Cupom não é válido para este prestador' }, { status: 400 });
    }

    // Calcula desconto
    let discount_amount = 0;
    if (coupon.discount_type === 'percentage') {
      discount_amount = (amount * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) {
        discount_amount = Math.min(discount_amount, coupon.max_discount_amount);
      }
    } else {
      discount_amount = coupon.discount_value;
    }

    const final_amount = Math.max(0, amount - discount_amount);

    return Response.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount_amount: coupon.max_discount_amount
      },
      discount_amount: Math.round(discount_amount * 100) / 100,
      final_amount: Math.round(final_amount * 100) / 100,
      message: `Cupom aplicado! Desconto de R$ ${discount_amount.toFixed(2)}`
    });

  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});