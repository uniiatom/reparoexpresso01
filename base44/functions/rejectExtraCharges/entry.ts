import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      service_id,
      provider_id,
      provider_name,
      client_name,
      rejection_notes,
    } = payload;

    // Busca o serviço
    const service = await base44.entities.ServiceRequest.get(service_id);
    if (!service) {
      return Response.json({ error: 'Service not found' }, { status: 404 });
    }

    // Atualiza status do orçamento extra para rejeitado
    await base44.entities.ServiceRequest.update(service_id, {
      extra_charges: {
        ...service.extra_charges,
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_notes,
      },
    });

    // Busca o provider para enviar notificação
    const providers = await base44.entities.Provider.filter({ id: provider_id }, '', 1);
    const provider = providers[0];

    // Envia notificação de rejeição por email
    await base44.integrations.Core.SendEmail({
      to: provider?.email || service.provider_phone,
      subject: `❌ Orçamento extra rejeitado - ${service.service_number}`,
      body: `
Olá ${provider_name},

O cliente ${client_name} rejeitou o orçamento extra solicitado para o serviço ${service.service_number}.

Motivo da rejeição:
${rejection_notes}

Entre em contato com o cliente para discutir outras opções ou finalize o serviço conforme acordado.

Plataforma de Serviços
      `,
    });

    // Se provider tem subscription push, envia notificação push
    if (provider?.push_subscription) {
      try {
        const subscription = JSON.parse(provider.push_subscription);
        await base44.functions.invoke('sendPushNotification', {
          subscription,
          title: '❌ Orçamento Rejeitado',
          body: `${client_name} rejeitou o orçamento extra`,
          data: {
            service_id,
            service_number: service.service_number,
            type: 'extra_charges_rejected',
          },
        });
      } catch (e) {
        console.warn('[rejectExtraCharges] Could not send push:', e.message);
      }
    }

    // Cria notificação no banco para o prestador
    try {
      await base44.entities.ProviderNotification.create({
        provider_id,
        type: 'extra_charges_rejected',
        title: 'Orçamento Extra Rejeitado',
        message: `${client_name} rejeitou o orçamento extra: ${rejection_notes}`,
        service_id,
        is_read: false,
      });
    } catch (e) {
      console.warn('[rejectExtraCharges] Could not create notification:', e.message);
    }

    return Response.json({
      success: true,
      message: 'Extra charges rejected',
      service_id,
    });
  } catch (error) {
    console.error('[rejectExtraCharges] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});