import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca serviços agendados para as próximas 24h
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const services = await base44.asServiceRole.entities.ServiceRequest.filter({
      scheduled_date: {
        $gte: now.toISOString().split('T')[0],
        $lte: tomorrow.toISOString().split('T')[0]
      },
      status: { $in: ['agendado', 'aceito'] }
    }, '-created_date', 100);

    if (services.length === 0) {
      return Response.json({ success: true, message: 'Nenhum serviço para alertar' });
    }

    // Envia alertas para cada serviço
    for (const service of services) {
      // Busca cliente e prestador
      const client = await base44.asServiceRole.entities.Client.filter({
        user_id: service.client_id
      });
      const provider = service.provider_id 
        ? await base44.asServiceRole.entities.Provider.filter({ user_id: service.provider_id })
        : null;

      const serviceTime = service.scheduled_time || '(horário a definir)';
      const serviceName = service.service_type?.replace(/_/g, ' ') || 'Serviço';

      // 1. Alerta para cliente
      if (client[0]?.user_id) {
        await base44.integrations.Core.SendEmail({
          to: client[0].user_id,
          subject: `⏰ Lembrete: Seu serviço de ${serviceName} é amanhã`,
          body: `Olá ${client[0].name},\n\nSeu serviço de ${serviceName} está agendado para amanhã às ${serviceTime} com ${service.provider_name || 'um prestador'}.\n\nEndereço: ${service.address}, ${service.city}\n\nAcesse sua conta para mais detalhes.\n\nReparo Expresso`
        });
      }

      // 2. Alerta para prestador
      if (provider?.[0]?.user_id && provider[0].is_online) {
        await base44.integrations.Core.SendEmail({
          to: provider[0].user_id,
          subject: `📋 Lembrete: Serviço de ${serviceName} amanhã`,
          body: `Olá ${provider[0].name},\n\nVocê tem um serviço de ${serviceName} agendado para amanhã às ${serviceTime} com ${client[0].name}.\n\nEndereço: ${service.address}, ${service.city}\nTelefone: ${service.client_phone}\n\nReparo Expresso`
        });
      }

      // 3. Alerta para admin
      await base44.integrations.Core.SendEmail({
        to: 'admin@reparoexpresso.com',
        subject: `[ADMIN] Serviço ${serviceName} agendado para amanhã`,
        body: `Cliente: ${service.client_name}\nPrestador: ${service.provider_name || 'Não alocado'}\nServiço: ${serviceName}\nHorário: ${serviceTime}\nEndereço: ${service.address}, ${service.city}`
      });
    }

    return Response.json({ 
      success: true, 
      message: `Alertas enviados para ${services.length} serviço(s)` 
    });
  } catch (error) {
    console.error('Erro ao enviar lembretes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});