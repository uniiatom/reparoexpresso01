import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Apenas admins podem gerar fechamentos' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // Determina o período: pode vir no body ou usa o período anterior automaticamente
  let periodStart, periodEnd;
  const today = new Date();

  if (body.period_start && body.period_end) {
    periodStart = new Date(body.period_start + 'T00:00:00');
    periodEnd = new Date(body.period_end + 'T23:59:59');
  } else {
    // Calcula o período quinzenal anterior automaticamente
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();

    if (day >= 16) {
      // Estamos na 2ª quinzena → período anterior: 1 a 15 do mês atual
      periodStart = new Date(year, month, 1, 0, 0, 0);
      periodEnd = new Date(year, month, 15, 23, 59, 59);
    } else {
      // Estamos na 1ª quinzena → período anterior: 16 ao último dia do mês anterior
      const lastMonth = month === 0 ? 11 : month - 1;
      const lastMonthYear = month === 0 ? year - 1 : year;
      const lastDay = new Date(lastMonthYear, lastMonth + 1, 0).getDate();
      periodStart = new Date(lastMonthYear, lastMonth, 16, 0, 0, 0);
      periodEnd = new Date(lastMonthYear, lastMonth, lastDay, 23, 59, 59);
    }
  }

  const fmtDate = (d) => d.toISOString().split('T')[0];
  const fmtLabel = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const periodLabel = `${fmtLabel(periodStart)} a ${fmtLabel(periodEnd)}`;

  console.log(`[fechamento] período: ${periodLabel}`);

  // Busca todos os serviços concluídos
  const allServices = await base44.asServiceRole.entities.ServiceRequest.filter({ status: 'concluido' });

  // Filtra por período (usa updated_date que é quando o serviço foi concluído)
  const services = allServices.filter(s => {
    const date = new Date(s.updated_date || s.created_date);
    return date >= periodStart && date <= periodEnd;
  });

  console.log(`[fechamento] ${services.length} serviços no período`);

  if (services.length === 0) {
    return Response.json({ message: 'Nenhum serviço no período informado', period: periodLabel, closings: [] });
  }

  // Agrupa por prestador
  const byProvider = {};
  for (const s of services) {
    if (!s.provider_id) continue;
    if (!byProvider[s.provider_id]) {
      byProvider[s.provider_id] = {
        provider_id: s.provider_id,
        provider_name: s.provider_name || 'Desconhecido',
        services: [],
      };
    }
    byProvider[s.provider_id].services.push(s);
  }

  const createdClosings = [];

  for (const [providerId, data] of Object.entries(byProvider)) {
    // Verifica se já existe fechamento para esse período/prestador
    const existing = await base44.asServiceRole.entities.BiweeklyClosing.filter({
      provider_id: providerId,
      period_start: fmtDate(periodStart),
    });

    if (existing.length > 0) {
      console.log(`[fechamento] já existe para ${data.provider_name} em ${fmtDate(periodStart)}`);
      continue;
    }

    const grossAmount = data.services.reduce((sum, s) => sum + (s.final_price || 0), 0);
    const reserveDeduction = Math.round(grossAmount * 0.03 * 100) / 100;
    const netAmount = Math.round((grossAmount - reserveDeduction) * 100) / 100;

    const closing = await base44.asServiceRole.entities.BiweeklyClosing.create({
      provider_id: providerId,
      provider_name: data.provider_name,
      period_start: fmtDate(periodStart),
      period_end: fmtDate(periodEnd),
      period_label: periodLabel,
      total_services: data.services.length,
      gross_amount: grossAmount,
      reserve_fund_deduction: reserveDeduction,
      net_amount: netAmount,
      status: 'pendente_nota',
      service_ids: data.services.map(s => s.id),
    });

    createdClosings.push(closing);
    console.log(`[fechamento] criado para ${data.provider_name}: R$ ${netAmount}`);
  }

  return Response.json({
    message: `${createdClosings.length} fechamento(s) gerado(s) para o período ${periodLabel}`,
    period: periodLabel,
    closings: createdClosings,
  });
});