import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * autoClosingReview — Fechamento automático com conferência de valores
 * 
 * 1. Busca todos os serviços concluídos no período
 * 2. Confere valores (final_price preenchido, provider vinculado)
 * 3. Gera relatório de inconsistências
 * 4. Cria BiweeklyClosings com status 'pendente_nota' para os aprovados
 * 5. Retorna um resumo detalhado para exibição no painel admin
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Apenas admins podem executar o fechamento' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // --- Determina o período ---
  let periodStart, periodEnd;
  const today = new Date();

  if (body.period_start && body.period_end) {
    periodStart = new Date(body.period_start + 'T00:00:00');
    periodEnd   = new Date(body.period_end   + 'T23:59:59');
  } else {
    const day   = today.getDate();
    const month = today.getMonth();
    const year  = today.getFullYear();
    if (day >= 16) {
      periodStart = new Date(year, month, 1,  0,  0,  0);
      periodEnd   = new Date(year, month, 15, 23, 59, 59);
    } else {
      const lm   = month === 0 ? 11 : month - 1;
      const lmy  = month === 0 ? year - 1 : year;
      const ld   = new Date(lmy, lm + 1, 0).getDate();
      periodStart = new Date(lmy, lm, 16,  0,  0,  0);
      periodEnd   = new Date(lmy, lm, ld, 23, 59, 59);
    }
  }

  const fmtDate  = (d) => d.toISOString().split('T')[0];
  const fmtLabel = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const periodLabel = `${fmtLabel(periodStart)} a ${fmtLabel(periodEnd)}`;

  console.log(`[autoClosing] período: ${periodLabel}`);

  // --- Busca serviços concluídos (opcionalmente filtrados por prestador) ---
  const filterQuery = { status: 'concluido' };
  if (body.provider_id) filterQuery.provider_id = body.provider_id;

  const allServices = await base44.asServiceRole.entities.ServiceRequest.filter(filterQuery);

  const services = allServices.filter(s => {
    const date = new Date(s.updated_date || s.created_date);
    return date >= periodStart && date <= periodEnd;
  });

  console.log(`[autoClosing] ${services.length} serviços no período`);

  // --- Conferência e classificação ---
  const approved  = [];  // prontos para fechamento
  const issues    = [];  // inconsistências detectadas

  for (const s of services) {
    const errs = [];

    if (!s.provider_id)   errs.push('Sem prestador vinculado');
    if (!s.provider_name) errs.push('Nome do prestador ausente');
    if (!s.final_price || s.final_price <= 0) errs.push('Valor final não informado ou zerado');
    if (!s.service_type)  errs.push('Tipo de serviço não informado');

    if (errs.length > 0) {
      issues.push({ service_id: s.id, service_number: s.service_number, client: s.client_name, provider: s.provider_name, errors: errs });
    } else {
      approved.push(s);
    }
  }

  console.log(`[autoClosing] aprovados: ${approved.length} | pendências: ${issues.length}`);

  // --- Agrupa aprovados por prestador ---
  const byProvider = {};
  for (const s of approved) {
    if (!byProvider[s.provider_id]) {
      byProvider[s.provider_id] = {
        provider_id:   s.provider_id,
        provider_name: s.provider_name,
        services: [],
      };
    }
    byProvider[s.provider_id].services.push(s);
  }

  // --- Cria fechamentos (evitando duplicatas) ---
  const createdClosings   = [];
  const existingClosings  = [];

  for (const [providerId, data] of Object.entries(byProvider)) {
    const existing = await base44.asServiceRole.entities.BiweeklyClosing.filter({
      provider_id:  providerId,
      period_start: fmtDate(periodStart),
    });

    if (existing.length > 0) {
      existingClosings.push({ provider_name: data.provider_name, closing_id: existing[0].id });
      console.log(`[autoClosing] fechamento já existe para ${data.provider_name}`);
      continue;
    }

    const grossAmount     = data.services.reduce((s, r) => s + (r.final_price || 0), 0);
    const reserveDeduction = Math.round(grossAmount * 0.03 * 100) / 100;
    const netAmount       = Math.round((grossAmount - reserveDeduction) * 100) / 100;

    const serviceDetails  = data.services.map(s => ({
      id:            s.id,
      service_number: s.service_number,
      service_type:  s.service_type,
      client_name:   s.client_name,
      final_price:   s.final_price,
      completed_at:  s.updated_date,
    }));

    const closing = await base44.asServiceRole.entities.BiweeklyClosing.create({
      provider_id:            providerId,
      provider_name:          data.provider_name,
      period_start:           fmtDate(periodStart),
      period_end:             fmtDate(periodEnd),
      period_label:           periodLabel,
      total_services:         data.services.length,
      gross_amount:           grossAmount,
      reserve_fund_deduction: reserveDeduction,
      net_amount:             netAmount,
      status:                 'pendente_nota',
      service_ids:            data.services.map(s => s.id),
      notes:                  `Fechamento automático gerado em ${new Date().toLocaleString('pt-BR')}. Serviços verificados: ${data.services.length}.`,
    });

    createdClosings.push({
      closing_id:     closing.id,
      provider_name:  data.provider_name,
      total_services: data.services.length,
      gross_amount:   grossAmount,
      net_amount:     netAmount,
      services:       serviceDetails,
    });

    console.log(`[autoClosing] fechamento criado para ${data.provider_name}: R$ ${netAmount}`);
  }

  return Response.json({
    success: true,
    period:  periodLabel,
    summary: {
      total_services:    services.length,
      approved_services: approved.length,
      issues_count:      issues.length,
      closings_created:  createdClosings.length,
      closings_existing: existingClosings.length,
    },
    closings_created:  createdClosings,
    closings_existing: existingClosings,
    issues,
  });
});