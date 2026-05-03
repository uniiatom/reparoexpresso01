import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Busca todos os alarmes de serviço preventivo ativos
    const reminders = await base44.asServiceRole.entities.PreventiveServiceReminder.filter({
      is_active: true
    });

    const today = new Date().toISOString().split('T')[0];
    const results = [];

    for (const reminder of reminders) {
      const nextReminderDate = reminder.next_reminder_date;
      
      // Verifica se é o dia de enviar o lembrete
      if (nextReminderDate === today && !reminder.reminder_sent) {
        try {
          // Envia notificação por email
          const user = await base44.asServiceRole.entities.User.filter({ 
            id: reminder.client_id 
          });
          
          if (user && user[0]?.email) {
            const serviceLabel = getServiceLabel(reminder.service_type);
            const lastDate = new Date(reminder.last_service_date).toLocaleDateString('pt-BR');
            
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user[0].email,
              subject: `🔔 Lembrete: Hora de realizar ${serviceLabel}`,
              body: `Olá ${reminder.client_name},\n\nÉ hora de realizar a ${serviceLabel}!\n\nÚltimo serviço: ${lastDate}\nIntervalo: ${reminder.reminder_interval_label}\n\n${reminder.notes ? `Observações: ${reminder.notes}\n\n` : ''}Você pode solicitar este serviço através do nosso app.`
            });
          }

          // Atualiza o alarme marcando como enviado e calcula próxima data
          const nextDate = new Date(nextReminderDate);
          nextDate.setDate(nextDate.getDate() + reminder.reminder_interval_days);
          
          await base44.asServiceRole.entities.PreventiveServiceReminder.update(reminder.id, {
            reminder_sent: true,
            reminder_sent_date: new Date().toISOString(),
            next_reminder_date: nextDate.toISOString().split('T')[0]
          });

          results.push({
            reminder_id: reminder.id,
            client_name: reminder.client_name,
            service_type: reminder.service_type,
            status: 'sent'
          });
        } catch (error) {
          console.error(`Erro ao processar lembrete ${reminder.id}:`, error);
          results.push({
            reminder_id: reminder.id,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Erro ao enviar lembretes de serviço preventivo:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});

function getServiceLabel(serviceType) {
  const labels = {
    limpeza_caixa_dagua: 'limpeza da caixa d\'água',
    limpeza_gordura: 'limpeza da caixa de gordura',
    limpeza_calha: 'limpeza de calhas',
    ar_condicionado: 'manutenção do ar condicionado',
    hidraulica: 'revisão hidráulica',
    eletrica: 'revisão elétrica',
    revisao_geral: 'revisão geral'
  };
  return labels[serviceType] || serviceType;
}