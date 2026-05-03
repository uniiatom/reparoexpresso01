import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { scheduleId } = body;

    // Se é chamada via automação (sem scheduleId), processa todos os vencidos
    if (!scheduleId) {
      console.log('Iniciando processamento de agendamentos recorrentes vencidos...');
      
      const schedules = await base44.asServiceRole.entities.RecurringServiceSchedule.filter({ is_active: true });
      const today = new Date().toISOString().split('T')[0];
      let processedCount = 0;

      for (const schedule of schedules) {
        // Processa apenas os que venceram ou vencem hoje
        if (schedule.next_service_date <= today) {
          await processSchedule(base44, schedule);
          processedCount++;
        }
      }

      console.log(`✓ ${processedCount} agendamentos recorrentes processados`);
      return Response.json({ success: true, processed: processedCount });
    }

    // Se tem scheduleId, processa um específico
    const schedules = await base44.asServiceRole.entities.RecurringServiceSchedule.filter({ id: scheduleId });
    const schedule = schedules[0];

    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await processSchedule(base44, schedule);

    return Response.json({
      success: true,
      serviceRequestId: schedule.last_service_request_id,
    });
  } catch (error) {
    console.error('Erro ao criar serviço recorrente:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processSchedule(base44, schedule) {
  if (!schedule.is_active) return;

  // Busca dados do cliente
  const clients = await base44.asServiceRole.entities.Client.filter({ id: schedule.client_id });
  const client = clients[0];

  if (!client) {
    console.warn(`Cliente não encontrado para agendamento ${schedule.id}`);
    return;
  }

  // Cria um novo ServiceRequest baseado no agendamento
  const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.create({
    client_id: schedule.client_id,
    client_name: schedule.client_name || client.name,
    client_phone: client.phone,
    service_type: schedule.service_type,
    description: schedule.description,
    address: schedule.address,
    city: schedule.city,
    state: schedule.state,
    latitude: schedule.latitude,
    longitude: schedule.longitude,
    client_suggested_price: schedule.client_suggested_price,
    status: 'aguardando',
    modality: 'imediato',
    urgency: 'hoje',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: schedule.preferred_time || '09:00',
  });

  // Atualiza o agendamento recorrente com as próximas datas
  const nextServiceDate = calculateNextDate(schedule.next_service_date, schedule.recurrence_pattern);
  const endDate = schedule.end_date ? new Date(schedule.end_date) : null;

  // Valida se não ultrapassou a data final
  const shouldContinue = !endDate || new Date(nextServiceDate) <= endDate;

  if (shouldContinue) {
    await base44.asServiceRole.entities.RecurringServiceSchedule.update(schedule.id, {
      last_service_date: new Date().toISOString().split('T')[0],
      last_service_request_id: serviceRequest.id,
      next_service_date: nextServiceDate,
      total_occurrences_created: (schedule.total_occurrences_created || 0) + 1,
    });
  } else {
    // Desativa o agendamento se passou da data final
    await base44.asServiceRole.entities.RecurringServiceSchedule.update(schedule.id, {
      is_active: false,
    });
  }

  console.log(`✓ ServiceRequest criado para agendamento recorrente: ${schedule.id}`);
}

// Calcula a próxima data baseado no padrão de recorrência
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