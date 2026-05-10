import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_request_id, completion_type, reason } = await req.json();

    if (!service_request_id || !completion_type) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar o serviço
    const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(service_request_id);
    if (!serviceRequest) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    // Buscar provider do usuário
    const providers = await base44.asServiceRole.entities.Provider.filter({ user_id: user.id });
    const provider = providers?.[0];
    if (!provider) {
      return Response.json({ error: 'Prestador não encontrado' }, { status: 404 });
    }

    // Validar permissão (apenas prestador do serviço)
    if (serviceRequest.provider_id !== provider.id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const completionRecord = {
      type: completion_type,
      reason: reason || null,
      completed_at: new Date().toISOString(),
    };

    let newStatus = 'concluido';
    let notificationMessage = '';
    let notificationType = 'service_completed';

    switch (completion_type) {
      case 'success':
        newStatus = 'concluido';
        notificationMessage = 'Seu serviço foi concluído com sucesso!';
        notificationType = 'service_completed';
        break;

      case 'unsuccessful':
        newStatus = 'concluido';
        notificationMessage = `Serviço concluído, mas não foi bem-sucedido. Motivo: ${reason}`;
        notificationType = 'warning';
        break;

      case 'not_service_type':
        newStatus = 'cancelado';
        notificationMessage = `O prestador informou que não realiza esse tipo de serviço. Motivo: ${reason}`;
        notificationType = 'warning';
        break;

      case 'needs_return':
        newStatus = 'em_espera';
        notificationMessage = `Necessário um retorno para completar o serviço. Detalhes: ${reason}`;
        notificationType = 'warning';
        break;
    }

    // Atualizar a solicitação de serviço
    await base44.asServiceRole.entities.ServiceRequest.update(service_request_id, {
      status: newStatus,
      decline_reason: JSON.stringify(completionRecord),
    });

    // Aplicar garantia automática se serviço foi concluído com sucesso
    if (newStatus === 'concluido') {
      const warrantyDays = serviceRequest.service_type === 'desentupimento' ? 15 : 90;
      const warrantyEndDate = new Date();
      warrantyEndDate.setDate(warrantyEndDate.getDate() + warrantyDays);

      await base44.asServiceRole.entities.ServiceRequest.update(service_request_id, {
        warranty_end_date: warrantyEndDate.toISOString(),
        warranty_status: 'ativa',
      });

      console.log(`✓ Garantia de ${warrantyDays} dias aplicada ao serviço ${service_request_id}`);
    }

    // Notificar o cliente
    await base44.asServiceRole.entities.ClientNotification.create({
      client_id: serviceRequest.client_id,
      client_email: serviceRequest.client_name,
      type: notificationType,
      title: completion_type === 'success' ? 'Serviço Concluído' : 'Atualização no Serviço',
      message: notificationMessage,
      action_url: `/acompanhar/${service_request_id}`,
    });

    // Registrar no log
    await base44.asServiceRole.entities.AdminActivityLog.create({
      action: 'service_completed',
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      entity_type: 'ServiceRequest',
      entity_id: service_request_id,
      entity_label: `${serviceRequest.service_type} - ${serviceRequest.client_name}`,
      old_value: serviceRequest.status,
      new_value: newStatus,
      details: `Conclusão: ${completion_type}${reason ? ` - Motivo: ${reason}` : ''}`,
    });

    console.log(`✓ Serviço ${service_request_id} marcado como ${newStatus} (${completion_type})`);

    return Response.json({
      success: true,
      message: `Serviço marcado como ${completion_type}`,
      new_status: newStatus,
    });

  } catch (error) {
    console.error('Erro ao completar serviço:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});