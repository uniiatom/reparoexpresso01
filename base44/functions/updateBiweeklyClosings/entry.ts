import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Apenas admins podem atualizar fechamentos' }, { status: 403 });
  }

  // Busca todos os fechamentos que ainda não foram pagos
  const closings = await base44.asServiceRole.entities.BiweeklyClosing.filter({});
  const unpaid = closings.filter(c => c.status !== 'pago');

  if (unpaid.length === 0) {
    return Response.json({ message: 'Nenhum fechamento pendente para atualizar', updated: 0 });
  }

  // Busca todos os serviços concluídos
  const allServices = await base44.asServiceRole.entities.ServiceRequest.filter({ status: 'concluido' });

  let updatedCount = 0;

  for (const closing of unpaid) {
    const periodStart = new Date(closing.period_start + 'T00:00:00');
    const periodEnd = new Date(closing.period_end + 'T23:59:59');

    // Filtra serviços deste prestador no período
    const services = allServices.filter(s => {
      if (s.provider_id !== closing.provider_id) return false;
      const date = new Date(s.updated_date || s.created_date);
      return date >= periodStart && date <= periodEnd;
    });

    const grossAmount = services.reduce((sum, s) => sum + (s.final_price || 0), 0);
    const reserveDeduction = Math.round(grossAmount * 0.03 * 100) / 100;
    const netAmount = Math.round((grossAmount - reserveDeduction) * 100) / 100;

    // Só atualiza se houve mudança
    if (
      services.length !== closing.total_services ||
      grossAmount !== closing.gross_amount ||
      netAmount !== closing.net_amount
    ) {
      await base44.asServiceRole.entities.BiweeklyClosing.update(closing.id, {
        total_services: services.length,
        gross_amount: grossAmount,
        reserve_fund_deduction: reserveDeduction,
        net_amount: netAmount,
        service_ids: services.map(s => s.id),
      });
      updatedCount++;
      console.log(`[update] ${closing.provider_name}: ${services.length} serviços, R$ ${netAmount}`);
    }
  }

  return Response.json({
    message: `${updatedCount} fechamento(s) atualizado(s) com base nos serviços concluídos`,
    updated: updatedCount,
    checked: unpaid.length,
  });
});