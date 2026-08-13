import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, isCronRequest } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (!isCronRequest(req)) {
    return jsonResponse({ error: 'Unauthorized cron request' }, 401);
  }

  try {
    const supabase = getServiceClient();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: services, error } = await supabase
      .from('service_requests')
      .select('*, professions(name), sub_services(name)')
      .gte('scheduled_date', todayStr)
      .lte('scheduled_date', tomorrowStr)
      .in('status', ['agendado', 'aceito']);

    if (error) throw error;
    if (!services?.length) {
      return jsonResponse({ success: true, message: 'Nenhum serviço para alertar' });
    }

    let notified = 0;
    for (const service of services) {
      const serviceTime = service.scheduled_time || '(horário a definir)';
      const serviceName = service.sub_services?.name ?? service.professions?.name ?? 'Serviço';

      if (service.client_id) {
        await supabase.from('client_notifications').insert({
          client_id: service.client_id,
          client_email: service.created_by || '',
          type: 'reminder',
          title: `Lembrete: serviço amanhã`,
          message: `Seu serviço de ${serviceName} está agendado para ${service.scheduled_date} às ${serviceTime}.`,
          action_url: `/acompanhar/${service.id}`,
        });
      }

      if (service.provider_id) {
        await supabase.from('provider_notifications').insert({
          provider_id: service.provider_id,
          type: 'reminder',
          title: `Serviço amanhã: ${serviceName}`,
          message: `${service.client_name} — ${service.address}, ${service.city} às ${serviceTime}.`,
          action_url: `/prestador/servicos/${service.id}`,
        });
      }

      notified += 1;
    }

    return jsonResponse({ success: true, message: `Alertas enviados para ${notified} serviço(s)` });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
