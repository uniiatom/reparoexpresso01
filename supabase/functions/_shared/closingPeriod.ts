export interface ClosingPeriod {
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  periodStartStr: string;
  periodEndStr: string;
}

export function resolveClosingPeriod(body: {
  period_start?: string;
  period_end?: string;
}): ClosingPeriod {
  let periodStart: Date;
  let periodEnd: Date;
  const today = new Date();

  if (body.period_start && body.period_end) {
    periodStart = new Date(`${body.period_start}T00:00:00`);
    periodEnd = new Date(`${body.period_end}T23:59:59`);
  } else {
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    if (day >= 16) {
      periodStart = new Date(year, month, 1, 0, 0, 0);
      periodEnd = new Date(year, month, 15, 23, 59, 59);
    } else {
      const lm = month === 0 ? 11 : month - 1;
      const lmy = month === 0 ? year - 1 : year;
      const ld = new Date(lmy, lm + 1, 0).getDate();
      periodStart = new Date(lmy, lm, 16, 0, 0, 0);
      periodEnd = new Date(lmy, lm, ld, 23, 59, 59);
    }
  }

  const fmtDate = (d: Date) => d.toISOString().split('T')[0];
  const fmtLabel = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return {
    periodStart,
    periodEnd,
    periodLabel: `${fmtLabel(periodStart)} a ${fmtLabel(periodEnd)}`,
    periodStartStr: fmtDate(periodStart),
    periodEndStr: fmtDate(periodEnd),
  };
}

export function groupServicesByProvider(services: Array<Record<string, unknown>>) {
  const byProvider: Record<string, {
    provider_id: string;
    provider_name: string;
    services: Array<Record<string, unknown>>;
  }> = {};

  for (const s of services) {
    const providerId = s.provider_id as string | undefined;
    if (!providerId) continue;
    if (!byProvider[providerId]) {
      byProvider[providerId] = {
        provider_id: providerId,
        provider_name: (s.provider_name as string) || 'Desconhecido',
        services: [],
      };
    }
    byProvider[providerId].services.push(s);
  }

  return byProvider;
}

export function calcClosingAmounts(services: Array<{ final_price?: number | null }>) {
  const grossAmount = services.reduce((sum, s) => sum + Number(s.final_price || 0), 0);
  const reserveDeduction = Math.round(grossAmount * 0.03 * 100) / 100;
  const netAmount = Math.round((grossAmount - reserveDeduction) * 100) / 100;
  return { grossAmount, reserveDeduction, netAmount };
}
