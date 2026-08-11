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
      original_price,
      extra_charges_total,
      new_total,
    } = payload;

    // Busca o serviço
    const service = await base44.entities.ServiceRequest.get(service_id);
    if (!service) {
      return Response.json({ error: 'Service not found' }, { status: 404 });
    }

    // Atualiza status do orçamento extra e valor final
    await base44.entities.ServiceRequest.update(service_id, {
      extra_charges: {
        ...service.extra_charges,
        status: 'approved',
        approved_at: new Date().toISOString(),
      },
      final_price: new_total,
      estimated_price: new_total,
    });

    // Busca o provider para enviar notificação push
    const providers = await base44.entities.Provider.filter({ id: provider_id }, '', 1);
    const provider = providers[0];

    // Se provider tem subscription push, envia notificação push
    if (provider?.push_subscription) {
      try {
        const subscription = JSON.parse(provider.push_subscription);
        await base44.functions.invoke('sendPushNotification', {
          subscription,
          title: '✅ Orçamento Aprovado',
          body: `${client_name} aprovou o extra de R$ ${extra_charges_total.toFixed(2)}`,
          data: {
            service_id,
            service_number: service.service_number,
            type: 'extra_charges_approved',
          },
        });
      } catch (e) {
        console.warn('[approveExtraCharges] Could not send push:', e.message);
      }
    }

    // Cria notificação no banco para o prestador
    try {
      await base44.entities.ProviderNotification.create({
        provider_id,
        type: 'extra_charges_approved',
        title: 'Orçamento Extra Aprovado',
        message: `${client_name} aprovou o extra de R$ ${extra_charges_total.toFixed(2)} para ${service.service_number}`,
        service_id,
        is_read: false,
      });
    } catch (e) {
      console.warn('[approveExtraCharges] Could not create notification:', e.message);
    }

    return Response.json({
      success: true,
      message: 'Extra charges approved',
      service_id,
    });
  } catch (error) {
    console.error('[approveExtraCharges] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});