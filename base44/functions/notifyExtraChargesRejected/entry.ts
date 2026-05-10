import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_id, provider_id } = await req.json();

    if (!service_id || !provider_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Busca serviço e prestador
    const service = await base44.entities.ServiceRequest.get(service_id);
    const provider = await base44.entities.Provider.get(provider_id);

    if (!provider) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    const emailBody = `
Olá ${provider.name}!

O cliente rejeitou o orçamento extra solicitado para o serviço #${service.service_number}.

🚫 **Serviço:** ${service.service_number}
📍 **Cliente:** ${service.client_name}
💰 **Orçamento original:** R$ ${(service.estimated_price || 0).toFixed(2)}

Você pode entrar em contato com o cliente para discutir outras opções ou continuar com o serviço original.

Obrigado!
Equipe Prática
    `;

    // Envia email
    await base44.integrations.Core.SendEmail({
      to: provider.email,
      subject: `Orçamento Extra Rejeitado - Serviço #${service.service_number}`,
      body: emailBody,
      from_name: 'Escola Prática',
    });

    // Cria notificação in-app para o prestador
    await base44.entities.ProviderNotification.create({
      provider_id,
      provider_email: provider.email,
      type: 'extra_charges_rejected',
      service_id,
      service_number: service.service_number,
      client_name: service.client_name,
      title: 'Orçamento Extra Rejeitado',
      message: `${service.client_name} rejeitou o orçamento extra solicitado`,
      is_read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifyExtraChargesRejected]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});