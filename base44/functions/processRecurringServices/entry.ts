import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Busca todos os agendamentos recorrentes ativos
    const recurringSchedules = await base44.asServiceRole.entities.RecurringServiceSchedule.filter({
      is_active: true
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];

    for (const schedule of recurringSchedules) {
      // Verifica se há termo final e se já foi atingido
      if (schedule.end_date) {
        const endDate = new Date(schedule.end_date);
        if (today > endDate) {
          // Desativa o agendamento
          await base44.asServiceRole.entities.RecurringServiceSchedule.update(schedule.id, {
            is_active: false
          });
          continue;
        }
      }

      // Verifica se é hora de criar o próximo serviço
      const nextServiceDate = new Date(schedule.next_service_date);
      if (today >= nextServiceDate) {
        // Cria a ordem de serviço
        const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.create({
          client_id: schedule.client_id,
          client_name: schedule.client_name,
          client_phone: schedule.client_phone,
          service_type: schedule.service_type,
          description: `[MANUTENÇÃO RECORRENTE] ${schedule.description}`,
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
          urgency: 'esta_semana'
        });

        // Calcula a próxima data
        const nextDate = calculateNextDate(
          schedule.next_service_date,
          schedule.recurrence_pattern
        );

        // Atualiza o agendamento recorrente
        await base44.asServiceRole.entities.RecurringServiceSchedule.update(schedule.id, {
          last_service_date: schedule.next_service_date,
          next_service_date: nextDate,
          last_service_request_id: serviceRequest.id,
          total_occurrences_created: (schedule.total_occurrences_created || 0) + 1
        });

        results.push({
          schedule_id: schedule.id,
          service_request_id: serviceRequest.id,
          next_date: nextDate
        });
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Erro ao processar serviços recorrentes:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});

function calculateNextDate(currentDate, pattern) {
  const date = new Date(currentDate);
  
  switch (pattern) {
    case 'semanal':
      date.setDate(date.getDate() + 7);
      break;
    case 'quinzenal':
      date.setDate(date.getDate() + 14);
      break;
    case 'mensal':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'bimestral':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'trimestral':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semestral':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'anual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split('T')[0];
}