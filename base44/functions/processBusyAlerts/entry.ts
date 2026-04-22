import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os BusyAlerts
    const alerts = await base44.asServiceRole.entities.BusyAlert.list();

    const now = new Date();
    const updates = [];

    for (const alert of alerts) {
      const createdAt = new Date(alert.created_date);
      const ageMinutes = (now - createdAt) / 1000 / 60;

      // Se passou 5 min e ainda está aguardando = nenhum prestador aceitou
      if (ageMinutes >= 5 && alert.status === 'aguardando') {
        // Marca como expirado (cliente pode agendar normalmente)
        updates.push(
          base44.asServiceRole.entities.BusyAlert.update(alert.id, {
            status: 'expirado',
          })
        );
      }
      // Se passou 30 min desde a criação, marca como expirado
      else if (ageMinutes >= 30) {
        updates.push(
          base44.asServiceRole.entities.BusyAlert.update(alert.id, {
            status: 'expirado',
          })
        );
      }
    }

    await Promise.all(updates);

    return Response.json({
      processed: updates.length,
      total: alerts.length,
    });
  } catch (error) {
    console.error('Erro ao processar BusyAlerts:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});