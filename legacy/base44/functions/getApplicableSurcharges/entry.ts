import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Retorna as sobretaxas aplicáveis para um dado horário/dia.
 * Payload: { datetime?: string (ISO), service_type?: string }
 * Se datetime não for fornecido, usa o horário atual de Brasília.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Data/hora de referência (padrão: agora em Brasília)
    const now = body.datetime ? new Date(body.datetime) : new Date();
    const serviceType = body.service_type || null;

    // Converte para horário de Brasília (UTC-3)
    const brOffset = -3 * 60; // minutos
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + brOffset;
    const brHour = ((utcMinutes / 60) % 24 + 24) % 24;
    const brMinutes = ((utcMinutes % 60) + 60) % 60;
    const brTimeMinutes = Math.floor(brHour) * 60 + brMinutes; // minutos desde meia-noite

    // Dia da semana em Brasília
    const brDay = now.getUTCDay(); // 0=Dom, 6=Sáb (aproximação; pode variar na virada)

    const allRules = await base44.asServiceRole.entities.SurchargeRule.filter({ is_active: true });

    const applicable = [];

    for (const rule of allRules) {
      // Filtro por tipo de serviço
      if (!rule.applies_to_all_services && serviceType) {
        if (!rule.service_types?.includes(serviceType)) continue;
      }

      let matches = false;

      if (rule.rule_type === 'holiday') {
        // Feriados são ativados manualmente (is_active = true quando é feriado)
        matches = true;
      } else if (rule.rule_type === 'day_of_week') {
        matches = (rule.days_of_week || []).includes(brDay);
      } else if (rule.rule_type === 'time_range') {
        // Verifica faixa de horário
        const timeStart = parseTimeToMinutes(rule.time_start);
        const timeEnd = parseTimeToMinutes(rule.time_end);

        if (timeStart !== null && timeEnd !== null) {
          if (timeStart <= timeEnd) {
            // Faixa no mesmo dia: ex 08:00 – 18:00
            matches = brTimeMinutes >= timeStart && brTimeMinutes < timeEnd;
          } else {
            // Faixa que passa da meia-noite: ex 22:00 – 06:00
            matches = brTimeMinutes >= timeStart || brTimeMinutes < timeEnd;
          }
        }

        // Se há restrição de dias, verifica também
        if (matches && rule.days_of_week?.length > 0) {
          matches = rule.days_of_week.includes(brDay);
        }
      }

      if (matches) {
        applicable.push({
          id: rule.id,
          name: rule.name,
          surcharge_percent: rule.surcharge_percent,
          rule_type: rule.rule_type,
          description: rule.description || '',
        });
      }
    }

    // Calcula o multiplicador total (aplica todas as sobretaxas cumulativamente)
    const totalPercent = applicable.reduce((sum, r) => sum + r.surcharge_percent, 0);
    const multiplier = 1 + totalPercent / 100;

    return Response.json({
      applicable,
      total_surcharge_percent: totalPercent,
      multiplier,
      reference_time: `${String(Math.floor(brHour)).padStart(2, '0')}:${String(brMinutes).padStart(2, '0')}`,
      day_of_week: brDay,
    });
  } catch (error) {
    console.error('[getApplicableSurcharges]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}