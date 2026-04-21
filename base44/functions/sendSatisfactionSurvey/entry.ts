import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { serviceRequestId } = await req.json();

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    // Busca a OS
    const serviceRequest = await base44.entities.ServiceRequest.get(serviceRequestId);
    if (!serviceRequest) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    // Busca dados do cliente
    const client = await base44.entities.Client.get(serviceRequest.client_id);
    const provider = serviceRequest.provider_id 
      ? await base44.entities.Provider.get(serviceRequest.provider_id) 
      : null;

    // Prepara links com token para rastrear origem
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://reparo-expresso.base44.com';
    const clientEmail = client?.name ? `${client.name.split(' ')[0]} (cliente)` : 'Cliente';
    const providerEmail = provider?.name ? `${provider.name.split(' ')[0]} (prestador)` : 'Prestador';

    // Envia email para cliente
    if (client?.email || serviceRequest.client_phone) {
      const clientMessage = `
Olá ${client?.name?.split(' ')[0] || 'Cliente'}!

O serviço solicitado foi concluído. Gostaríamos de saber como foi sua experiência!

Avalie agora: ${baseUrl}/acompanhar/${serviceRequestId}

Sua opinião ajuda a melhorar nossos serviços.

Obrigado!
`;

      await base44.integrations.Core.SendEmail({
        to: client?.email || serviceRequest.client_phone,
        subject: `Pesquisa: Como foi o serviço? - ${serviceRequest.service_number || 'OS'}`,
        body: clientMessage,
      }).catch(e => console.warn('[email cliente]', e.message));
    }

    // Envia notificação para prestador
    if (provider?.email || serviceRequest.provider_phone) {
      const providerMessage = `
Olá ${provider?.name?.split(' ')[0] || 'Prestador'}!

O cliente concluiu o serviço. Gostaríamos de saber como foi sua experiência!

Avalie agora: ${baseUrl}/prestador

Sua opinião nos ajuda a manter a qualidade da plataforma.

Obrigado!
`;

      await base44.integrations.Core.SendEmail({
        to: provider?.email || serviceRequest.provider_phone,
        subject: `Pesquisa: Como foi o serviço? - ${serviceRequest.service_number || 'OS'}`,
        body: providerMessage,
      }).catch(e => console.warn('[email prestador]', e.message));
    }

    return Response.json({
      success: true,
      message: 'Pesquisas enviadas',
      clientNotified: !!client?.email,
      providerNotified: !!provider?.email,
    });
  } catch (error) {
    console.error('[sendSatisfactionSurvey]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});