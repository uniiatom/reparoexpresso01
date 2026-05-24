import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  calcClosingAmounts,
  groupServicesByProvider,
  resolveClosingPeriod,
} from '../_shared/closingPeriod.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    if (auth.user.role !== 'admin') {
      return jsonResponse({ error: 'Apenas admins podem gerar fechamentos' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const period = resolveClosingPeriod(body);
    const supabase = getServiceClient();

    const { data: allServices, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('status', 'concluido');

    if (error) throw error;

    const services = (allServices ?? []).filter((s) => {
      const date = new Date(String(s.updated_at || s.created_at));
      return date >= period.periodStart && date <= period.periodEnd;
    });

    if (!services.length) {
      return jsonResponse({
        message: 'Nenhum serviço no período informado',
        period: period.periodLabel,
        closings: [],
      });
    }

    const byProvider = groupServicesByProvider(services);
    const createdClosings: Array<Record<string, unknown>> = [];

    for (const data of Object.values(byProvider)) {
      const { data: existing } = await supabase
        .from('biweekly_closings')
        .select('id')
        .eq('provider_id', data.provider_id)
        .eq('period_start', period.periodStartStr)
        .limit(1);

      if (existing?.length) continue;

      const { grossAmount, reserveDeduction, netAmount } = calcClosingAmounts(data.services);

      const { data: closing, error: cErr } = await supabase
        .from('biweekly_closings')
        .insert({
          provider_id: data.provider_id,
          provider_name: data.provider_name,
          period_start: period.periodStartStr,
          period_end: period.periodEndStr,
          period_label: period.periodLabel,
          total_services: data.services.length,
          gross_amount: grossAmount,
          reserve_fund_deduction: reserveDeduction,
          net_amount: netAmount,
          status: 'pendente_nota',
          service_ids: data.services.map((s) => s.id),
        })
        .select()
        .single();

      if (cErr) throw cErr;
      createdClosings.push(closing);
    }

    return jsonResponse({
      message: `${createdClosings.length} fechamento(s) gerado(s) para o período ${period.periodLabel}`,
      period: period.periodLabel,
      closings: createdClosings,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
