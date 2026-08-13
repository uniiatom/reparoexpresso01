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
      return jsonResponse({ error: 'Apenas admins podem executar o fechamento' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const period = resolveClosingPeriod(body);
    const supabase = getServiceClient();

    let query = supabase
      .from('service_requests')
      .select('*, professions(name), sub_services(name)')
      .eq('status', 'concluido');
    if (body.provider_id) query = query.eq('provider_id', body.provider_id);

    const { data: allServices, error } = await query;
    if (error) throw error;

    const services = (allServices ?? []).filter((s) => {
      const date = new Date(String(s.updated_at || s.created_at));
      return date >= period.periodStart && date <= period.periodEnd;
    });

    const approved: Array<Record<string, unknown>> = [];
    const issues: Array<Record<string, unknown>> = [];

    for (const s of services) {
      const errs: string[] = [];
      if (!s.provider_id) errs.push('Sem prestador vinculado');
      if (!s.provider_name) errs.push('Nome do prestador ausente');
      if (!s.final_price || Number(s.final_price) <= 0) errs.push('Valor final não informado ou zerado');
      if (!s.professions?.name && !s.sub_services?.name) errs.push('Tipo de serviço não informado');

      if (errs.length) {
        issues.push({
          service_id: s.id,
          service_number: s.service_number,
          client: s.client_name,
          provider: s.provider_name,
          errors: errs,
        });
      } else {
        approved.push(s);
      }
    }

    const byProvider = groupServicesByProvider(approved);
    const createdClosings: Array<Record<string, unknown>> = [];
    const existingClosings: Array<Record<string, unknown>> = [];

    for (const data of Object.values(byProvider)) {
      const { data: existing } = await supabase
        .from('biweekly_closings')
        .select('id')
        .eq('provider_id', data.provider_id)
        .eq('period_start', period.periodStartStr)
        .limit(1);

      if (existing?.length) {
        existingClosings.push({ provider_name: data.provider_name, closing_id: existing[0].id });
        continue;
      }

      const { grossAmount, reserveDeduction, netAmount } = calcClosingAmounts(data.services);
      const serviceDetails = data.services.map((s) => ({
        id: s.id,
        service_number: s.service_number,
        service_type: s.sub_services?.name ?? s.professions?.name ?? null,
        client_name: s.client_name,
        final_price: s.final_price,
        completed_at: s.updated_at,
      }));

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
          notes: `Fechamento automático gerado em ${new Date().toLocaleString('pt-BR')}.`,
        })
        .select()
        .single();

      if (cErr) throw cErr;

      createdClosings.push({
        closing_id: closing.id,
        provider_name: data.provider_name,
        total_services: data.services.length,
        gross_amount: grossAmount,
        net_amount: netAmount,
        services: serviceDetails,
      });
    }

    return jsonResponse({
      success: true,
      period: period.periodLabel,
      summary: {
        total_services: services.length,
        approved_services: approved.length,
        issues_count: issues.length,
        closings_created: createdClosings.length,
        closings_existing: existingClosings.length,
      },
      closings_created: createdClosings,
      closings_existing: existingClosings,
      issues,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
