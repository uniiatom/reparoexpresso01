import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { calculateNextRecurrenceDate } from '../_shared/recurrence.ts';
import { getServiceClient, isCronRequest, invokeInternalFunction } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (!isCronRequest(req)) {
    return jsonResponse({ error: 'Unauthorized cron request' }, 401);
  }

  try {
    const supabase = getServiceClient();
    const { data: schedules, error } = await supabase
      .from('recurring_service_schedules')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: Array<Record<string, unknown>> = [];

    for (const schedule of schedules ?? []) {
      if (schedule.end_date) {
        const endDate = new Date(`${schedule.end_date}T23:59:59`);
        if (today > endDate) {
          await supabase.from('recurring_service_schedules').update({ is_active: false }).eq('id', schedule.id);
          continue;
        }
      }

      const nextServiceDate = new Date(`${schedule.next_service_date}T00:00:00`);
      if (today < nextServiceDate) continue;

      // `service_requests.profession_id` é obrigatório (ver MIGRATION.md
      // seção 0.1) — agendas antigas criadas antes da coluna existir não têm
      // como ser processadas automaticamente; pula sem derrubar o cron
      // inteiro pros demais agendamentos.
      if (!schedule.profession_id) {
        results.push({ schedule_id: schedule.id, skipped: true, reason: 'profession_id ausente' });
        continue;
      }

      const { data: serviceRequest, error: createErr } = await supabase
        .from('service_requests')
        .insert({
          client_id: schedule.client_id,
          client_name: schedule.client_name,
          client_phone: schedule.client_phone,
          profession_id: schedule.profession_id,
          sub_service_id: schedule.sub_service_id,
          description: `[MANUTENÇÃO RECORRENTE] ${schedule.description || ''}`,
          address: schedule.address,
          city: schedule.city,
          state: schedule.state,
          latitude: schedule.latitude,
          longitude: schedule.longitude,
          client_suggested_price: schedule.client_suggested_price,
          modality: 'agendado',
          scheduled_date: schedule.next_service_date,
          scheduled_time: schedule.preferred_time || '09:00',
          status: 'aguardando',
          urgency: 'esta_semana',
        })
        .select('id')
        .single();

      if (createErr) throw createErr;

      const nextDate = calculateNextRecurrenceDate(
        schedule.next_service_date,
        schedule.recurrence_pattern || 'mensal',
      );

      await supabase.from('recurring_service_schedules').update({
        last_service_date: schedule.next_service_date,
        next_service_date: nextDate,
        last_service_request_id: serviceRequest.id,
        total_occurrences_created: (schedule.total_occurrences_created || 0) + 1,
      }).eq('id', schedule.id);

      await invokeInternalFunction('onServiceCreated', { request_id: serviceRequest.id });

      results.push({
        schedule_id: schedule.id,
        service_request_id: serviceRequest.id,
        next_date: nextDate,
      });
    }

    return jsonResponse({ success: true, processed: results.length, results });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro', success: false }, 500);
  }
});
