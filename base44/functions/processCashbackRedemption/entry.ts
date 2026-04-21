import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cashbackIds, redemptionType } = await req.json();

    // redemptionType: "pix" ou "course"
    if (!['pix', 'course'].includes(redemptionType)) {
      return Response.json(
        { error: 'redemptionType deve ser "pix" ou "course"' },
        { status: 400 }
      );
    }

    if (!Array.isArray(cashbackIds) || cashbackIds.length === 0) {
      return Response.json(
        { error: 'cashbackIds deve ser um array não vazio' },
        { status: 400 }
      );
    }

    // Busca os registros de cashback
    const cashbackRecords = await Promise.all(
      cashbackIds.map(id => base44.entities.Cashback.get(id))
    );

    const validRecords = cashbackRecords.filter(
      cb => cb && cb.status === 'disponivel'
    );

    if (validRecords.length === 0) {
      return Response.json(
        { error: 'Nenhum cashback disponível para resgate' },
        { status: 400 }
      );
    }

    // Calcula valor total
    const totalValue = validRecords.reduce((sum, cb) => sum + cb.cashback_amount, 0);

    // Regra 1: PIX - mínimo R$200
    if (redemptionType === 'pix') {
      if (totalValue < 200) {
        return Response.json(
          {
            success: false,
            reason: 'insufficient_balance',
            message: `Saldo insuficiente. Mínimo R$ 200,00 para resgate via PIX. Você tem R$ ${totalValue.toFixed(2)}.`,
            currentBalance: totalValue,
            minimumRequired: 200,
          },
          { status: 400 }
        );
      }

      // Marca os cashbacks como utilizados
      await Promise.all(
        validRecords.map(cb =>
          base44.entities.Cashback.update(cb.id, {
            status: 'utilizado',
            used_at: new Date().toISOString(),
          })
        )
      );

      return Response.json({
        success: true,
        type: 'pix',
        amount: totalValue,
        message: `✅ Resgate de R$ ${totalValue.toFixed(2)} solicitado via PIX. Você receberá em até 2 dias úteis.`,
        itemsRedeemed: validRecords.length,
      });
    }

    // Regra 2: COURSE - valor real * 2.5
    if (redemptionType === 'course') {
      const courseCredits = totalValue * 2.5;

      // Marca os cashbacks como utilizados
      await Promise.all(
        validRecords.map(cb =>
          base44.entities.Cashback.update(cb.id, {
            status: 'utilizado',
            used_at: new Date().toISOString(),
            used_in_request_id: 'course_redemption',
          })
        )
      );

      return Response.json({
        success: true,
        type: 'course',
        originalAmount: totalValue,
        courseCredits,
        message: `🎓 Resgate confirmado! Você tem R$ ${courseCredits.toFixed(2)} em crédito para cursos na Escola Prática.`,
        itemsRedeemed: validRecords.length,
        benefitMultiplier: 2.5,
      });
    }
  } catch (error) {
    console.error('[processCashbackRedemption]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});