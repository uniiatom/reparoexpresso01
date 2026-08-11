import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { couponCode } = await req.json();

    if (!couponCode) {
      return Response.json({ error: 'Código do cupom é obrigatório' }, { status: 400 });
    }

    // Busca o cupom
    const coupons = await base44.asServiceRole.entities.Coupon.filter({ 
      code: couponCode.toUpperCase() 
    });

    if (coupons.length === 0) {
      return Response.json({ error: 'Cupom não encontrado' }, { status: 404 });
    }

    const coupon = coupons[0];

    // Incrementa o uso
    const newUses = (coupon.current_uses || 0) + 1;
    await base44.asServiceRole.entities.Coupon.update(coupon.id, {
      current_uses: newUses
    });

    console.log(`Cupom ${couponCode} incrementado para ${newUses} usos`);

    return Response.json({ success: true, new_uses: newUses });

  } catch (error) {
    console.error('Erro ao incrementar uso do cupom:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});