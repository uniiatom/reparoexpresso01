import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id, approved, notes = '' } = await req.json();

    if (!request_id) {
      return Response.json({ error: 'request_id é obrigatório' }, { status: 400 });
    }

    // Busca o serviço
    const services = await base44.entities.ServiceRequest.filter({ id: request_id });
    if (!services?.length) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    const service = services[0];

    // Valida se quem está aprovando é o cliente
    if (service.created_by !== user.email) {
      return Response.json({ error: 'Você não tem permissão para aprovar este serviço' }, { status: 403 });
    }

    // Atualiza o serviço
    const newStatus = approved ? 'aceito' : 'cancelado';
    const updateData = {
      status: newStatus,
      approval_notes: notes,
      approved_at: new Date().toISOString(),
      approved_by: user.full_name
    };

    await base44.entities.ServiceRequest.update(request_id, updateData);

    // Envia notificação para o prestador
    if (service.provider_id) {
      try {
        await base44.functions.invoke('sendPushNotification', {
          user_id: service.provider_id,
          title: approved ? '✅ Orçamento Aprovado!' : '❌ Orçamento Recusado',
          body: approved 
            ? `Cliente ${service.client_name} aprovou o orçamento de R$ ${(service.estimated_price || 0).toFixed(2)}`
            : `Cliente ${service.client_name} recusou o orçamento${notes ? ': ' + notes : ''}`,
          action_url: `/acompanhar/${request_id}`,
          data: { request_id, status: newStatus }
        });
      } catch (e) {
        console.warn('⚠️ Falha ao enviar notificação ao prestador:', e.message);
      }
    }

    console.log(`✅ Orçamento ${approved ? 'aprovado' : 'recusado'} para serviço ${request_id}`);

    return Response.json({
      success: true,
      status: newStatus,
      message: approved ? 'Orçamento aprovado com sucesso!' : 'Orçamento recusado'
    });
  } catch (error) {
    console.error('❌ Erro ao processar aprovação:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});