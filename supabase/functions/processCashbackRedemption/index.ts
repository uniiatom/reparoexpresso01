import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    await requireUser(req);
    const { cashbackIds, redemptionType } = await req.json();

    if (!['pix', 'course'].includes(redemptionType)) {
      return jsonResponse({ error: 'redemptionType deve ser "pix" ou "course"' }, 400);
    }
    if (!Array.isArray(cashbackIds) || cashbackIds.length === 0) {
      return jsonResponse({ error: 'cashbackIds deve ser um array não vazio' }, 400);
    }

    const supabase = getServiceClient();
    const { data: records, error } = await supabase
      .from('cashbacks')
      .select('*')
      .in('id', cashbackIds);

    if (error) throw error;

    const validRecords = (records ?? []).filter((cb) => cb.status === 'disponivel');
    if (!validRecords.length) {
      return jsonResponse({ error: 'Nenhum cashback disponível para resgate' }, 400);
    }

    const totalValue = validRecords.reduce((sum, cb) => sum + Number(cb.cashback_amount || 0), 0);

    if (redemptionType === 'pix') {
      if (totalValue < 200) {
        return jsonResponse({
          success: false,
          reason: 'insufficient_balance',
          message: `Saldo insuficiente. Mínimo R$ 200,00 para resgate via PIX. Você tem R$ ${totalValue.toFixed(2)}.`,
          currentBalance: totalValue,
          minimumRequired: 200,
        }, 400);
      }

      await supabase.from('cashbacks').update({
        status: 'utilizado',
        used_at: new Date().toISOString(),
      }).in('id', validRecords.map((r) => r.id));

      return jsonResponse({
        success: true,
        type: 'pix',
        amount: totalValue,
        message: `Resgate de R$ ${totalValue.toFixed(2)} solicitado via PIX. Você receberá em até 2 dias úteis.`,
        itemsRedeemed: validRecords.length,
      });
    }

    const courseCredits = totalValue * 2.5;
    await supabase.from('cashbacks').update({
      status: 'utilizado',
      used_at: new Date().toISOString(),
      used_in_request_id: 'course_redemption',
    }).in('id', validRecords.map((r) => r.id));

    return jsonResponse({
      success: true,
      type: 'course',
      originalAmount: totalValue,
      courseCredits,
      message: `Resgate confirmado! Você tem R$ ${courseCredits.toFixed(2)} em crédito para cursos na Escola Prática.`,
      itemsRedeemed: validRecords.length,
      benefitMultiplier: 2.5,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
