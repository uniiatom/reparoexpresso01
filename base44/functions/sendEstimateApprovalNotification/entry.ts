import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { request_id, client_email, estimated_price, provider_name, service_type } = body;

    if (!request_id || !client_email) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    console.log(`[estimateNotif] 📧 Enviando notificação para: ${client_email}`);
    console.log(`[estimateNotif] 💰 Orçamento: R$ ${estimated_price}`);

    // Busca cliente por email
    const clients = await base44.entities.Client.filter({ user_id: client_email });
    if (!clients?.length) {
      console.warn(`[estimateNotif] ⚠️ Cliente não encontrado: ${client_email}`);
      return Response.json({ warning: 'Client not found' });
    }

    const client = clients[0];
    console.log(`[estimateNotif] ✅ Cliente encontrado: ${client.name}`);

    // Envia push notification se disponível
    try {
      await base44.functions.invoke('sendPushNotification', {
        client_id: client.id,
        title: `✓ Orçamento de ${provider_name || 'Prestador'}`,
        body: `R$ ${estimated_price?.toFixed(2) || '0.00'} - Clique para validar`,
        data: {
          type: 'estimate_pending',
          request_id: request_id,
          service_type: service_type,
          action: 'approve_estimate',
        },
      });
      console.log(`[estimateNotif] 📲 Push enviado com sucesso`);
    } catch (e) {
      console.warn(`[estimateNotif] ⚠️ Erro ao enviar push:`, e.message);
    }

    return Response.json({
      success: true,
      message: 'Notification sent',
      client_name: client.name,
    });
  } catch (error) {
    console.error('[estimateNotif] ❌ Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});