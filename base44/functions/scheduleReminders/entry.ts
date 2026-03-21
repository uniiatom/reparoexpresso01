import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Função para verificar agendamentos próximos e enviar lembretes
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar serviços agendados para as próximas 24 horas
    const serviceRequests = await base44.entities.ServiceRequest.list();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingServices = serviceRequests.filter(service => {
      if (service.status !== 'agendado' || !service.scheduled_date) return false;
      
      const scheduleDate = new Date(service.scheduled_date);
      scheduleDate.setHours(0, 0, 0, 0);
      
      return scheduleDate >= today && scheduleDate <= tomorrow;
    });

    console.log(`Found ${upcomingServices.length} upcoming services for reminders`);

    // Para cada serviço próximo, enviar notificação
    const reminders = upcomingServices.map(service => ({
      request_id: service.id,
      client_id: service.client_id,
      client_email: service.client_name,
      provider_id: service.provider_id,
      provider_name: service.provider_name,
      scheduled_date: service.scheduled_date,
      scheduled_time: service.scheduled_time,
      service_type: service.service_type,
      created_at: new Date().toISOString(),
    }));

    console.log('Reminders prepared:', reminders);

    return Response.json({
      success: true,
      message: `${reminders.length} reminder(s) processed`,
      reminders,
    });
  } catch (error) {
    console.error('Error in scheduleReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});