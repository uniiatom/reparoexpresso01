import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      service_id,
      provider_id,
      provider_name,
      client_name,
      original_price,
      material_total,
      labor_total,
      extra_charges_total,
      new_total,
      items,
      labor,
      photos
    } = payload;

    // Busca o serviço para pegar informações do cliente
    const services = await base44.asServiceRole.entities.ServiceRequest.filter({ id: service_id });
    if (!services || services.length === 0) {
      return Response.json({ error: 'Service not found' }, { status: 404 });
    }
    const service = services[0];

    // Cria notificação para o cliente
    const notification = await base44.asServiceRole.entities.ClientNotification.create({
      client_id: service.client_id,
      client_email: service.created_by,
      type: 'extra_charges_pending',
      title: `Orçamento extra de ${provider_name}`,
      message: `${provider_name} solicitou um orçamento extra. Materiais: R$ ${material_total.toFixed(2)}${labor ? ` + Mão de obra: R$ ${labor_total.toFixed(2)}` : ''}. Revise e aprove ou rejeite a solicitação.`,
      service_id: service_id,
      service_number: service.service_number,
      provider_name: provider_name,
      extra_total: extra_charges_total,
      new_total: new_total,
      is_read: false,
    });

    return Response.json({
      success: true,
      notification_id: notification.id,
    });
  } catch (error) {
    console.error('[sendExtraChargesRequest] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});