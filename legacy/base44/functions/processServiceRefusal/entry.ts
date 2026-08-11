import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_request_id, provider_id, reasons, description, photos } = await req.json();

    // Validação
    if (!service_request_id || !provider_id || !reasons?.length || !description?.trim() || !photos?.length) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar a solicitação de serviço
    const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(service_request_id);
    if (!serviceRequest) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    if (serviceRequest.provider_id !== provider_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar o cliente
    const clientId = serviceRequest.client_id;
    const client = await base44.asServiceRole.entities.Client.get(clientId).catch(() => null);

    // Volta o serviço para aguardando e limpa o prestador, para que outro seja buscado
    await base44.asServiceRole.entities.ServiceRequest.update(service_request_id, {
      status: 'aguardando',
      provider_id: null,
      provider_name: null,
      provider_phone: null,
      estimated_arrival_minutes: null,
      decline_reason: JSON.stringify({
        type: 'technical_refusal',
        reasons,
        description,
        photos,
        refused_by_provider_id: provider_id,
        timestamp: new Date().toISOString(),
      }),
    });

    // Sem estorno: o serviço continua ativo e será reatribuído a outro prestador

    // Registrar no log de atividades
    await base44.asServiceRole.entities.AdminActivityLog.create({
      action: 'service_refused',
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      entity_type: 'ServiceRequest',
      entity_id: service_request_id,
      entity_label: `${serviceRequest.service_type} - ${serviceRequest.client_name}`,
      old_value: serviceRequest.status,
      new_value: 'aguardando',
      details: `Recusa técnica justificada. Serviço voltou para busca de novo prestador. Motivos: ${reasons.join(', ')}. Descrição: ${description}.`,
    });

    // Notificar cliente que está buscando novo prestador
    if (clientId) {
      await base44.asServiceRole.entities.ClientNotification.create({
        client_id: clientId,
        client_email: client?.email || '',
        type: 'warning',
        title: 'Buscando novo prestador',
        message: `O prestador não pôde executar o serviço no local (${reasons.join(', ')}). Estamos buscando outro profissional para você automaticamente.`,
        action_url: `/acompanhar/${service_request_id}`,
      });
    }

    console.log(`✓ Recusa processada: Serviço ${service_request_id} voltou para aguardando, buscando novo prestador.`);

    return Response.json({
      success: true,
      message: 'Recusa registrada. Serviço voltou para a fila de busca.',
    });

  } catch (error) {
    console.error('Erro ao processar recusa:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});