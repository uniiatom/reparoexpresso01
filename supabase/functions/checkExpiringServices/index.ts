import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, isCronRequest, invokeInternalFunction } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (!isCronRequest(req)) {
    return jsonResponse({ error: 'Unauthorized cron request' }, 401);
  }

  try {
    const supabase = getServiceClient();
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data: services, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('status', 'agendado');

    if (error) throw error;

    const expiring = (services ?? []).filter((service) => {
      if (!service.scheduled_date || !service.scheduled_time) return false;
      const [hours, minutes] = String(service.scheduled_time).split(':');
      const scheduledDateTime = new Date(`${service.scheduled_date}T${hours}:${minutes}:00`);
      return scheduledDateTime >= now && scheduledDateTime <= twoHoursLater;
    });

    for (const service of expiring) {
      if (!service.provider_id) continue;
      await invokeInternalFunction('sendPushNotification', {
        providerId: service.provider_id,
        title: 'Serviço próximo de vencer!',
        message: `${service.client_name} — ${service.address} em ${service.scheduled_time}`,
        data: { service_id: service.id, type: 'expiring_service', urgent: true },
      });
    }

    return jsonResponse({
      success: true,
      expiring_count: expiring.length,
      services: expiring.map((s) => ({ id: s.id, client: s.client_name, time: s.scheduled_time })),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
