import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Verifica serviços próximos de vencer (até 2 horas antes) e notifica prestadores
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Busca todos os serviços agendados
    const allServices = await base44.asServiceRole.entities.ServiceRequest.list('', 1000);
    
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const expiringServices = allServices.filter(service => {
      if (service.status !== 'agendado') return false;
      if (!service.scheduled_date || !service.scheduled_time) return false;
      
      // Monta datetime do agendamento
      const [hours, minutes] = service.scheduled_time.split(':');
      const scheduledDateTime = new Date(`${service.scheduled_date}T${hours}:${minutes}:00`);
      
      // Verifica se está entre agora e 2 horas no futuro
      return scheduledDateTime >= now && scheduledDateTime <= twoHoursLater;
    });
    
    console.log(`[Expiring] Found ${expiringServices.length} services expiring in next 2 hours`);
    
    // Para cada serviço vencendo, notifica o prestador
    for (const service of expiringServices) {
      if (!service.provider_id) {
        console.log(`[Expiring] Service ${service.id} has no provider yet`);
        continue;
      }
      
      // Busca o prestador
      const provider = await base44.asServiceRole.entities.Provider.get(service.provider_id);
      if (!provider) continue;
      
      // Envia notificação com som
      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          provider_id: provider.id,
          title: '⏰ Serviço próximo de vencer!',
          body: `${service.client_name} - ${service.address} em ${service.scheduled_time}`,
          sound: 'alert', // Som de alerta
          badge: 'expiring',
          data: {
            service_id: service.id,
            type: 'expiring_service',
            urgent: true
          }
        });
        console.log(`[Expiring] Notification sent to provider ${provider.id}`);
      } catch (e) {
        console.warn(`[Expiring] Failed to notify provider ${provider.id}:`, e.message);
      }
    }
    
    return Response.json({ 
      success: true, 
      expiring_count: expiringServices.length,
      services: expiringServices.map(s => ({ id: s.id, client: s.client_name, time: s.scheduled_time }))
    });
  } catch (error) {
    console.error('[Expiring] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});