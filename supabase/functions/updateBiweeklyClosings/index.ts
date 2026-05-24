import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { calcClosingAmounts } from '../_shared/closingPeriod.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    if (auth.user.role !== 'admin') {
      return jsonResponse({ error: 'Apenas admins podem atualizar fechamentos' }, 403);
    }

    const { supabase } = auth;
    const { data: closings } = await supabase.from('biweekly_closings').select('*');
    const unpaid = (closings ?? []).filter((c) => c.status !== 'pago');

    if (!unpaid.length) {
      return jsonResponse({ message: 'Nenhum fechamento pendente para atualizar', updated: 0 });
    }

    const { data: allServices } = await supabase
      .from('service_requests')
      .select('*')
      .eq('status', 'concluido');

    let updatedCount = 0;

    for (const closing of unpaid) {
      const periodStart = new Date(`${closing.period_start}T00:00:00`);
      const periodEnd = new Date(`${closing.period_end}T23:59:59`);

      const services = (allServices ?? []).filter((s) => {
        if (s.provider_id !== closing.provider_id) return false;
        const date = new Date(String(s.updated_at || s.created_at));
        return date >= periodStart && date <= periodEnd;
      });

      const { grossAmount, reserveDeduction, netAmount } = calcClosingAmounts(services);

      if (
        services.length !== closing.total_services ||
        grossAmount !== Number(closing.gross_amount) ||
        netAmount !== Number(closing.net_amount)
      ) {
        await supabase.from('biweekly_closings').update({
          total_services: services.length,
          gross_amount: grossAmount,
          reserve_fund_deduction: reserveDeduction,
          net_amount: netAmount,
          service_ids: services.map((s) => s.id),
        }).eq('id', closing.id);
        updatedCount += 1;
      }
    }

    return jsonResponse({
      message: `${updatedCount} fechamento(s) atualizado(s)`,
      updated: updatedCount,
      checked: unpaid.length,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
