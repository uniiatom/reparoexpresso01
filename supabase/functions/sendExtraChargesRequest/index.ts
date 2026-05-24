import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const payload = await req.json();
    const {
      service_id,
      provider_id,
      provider_name,
      material_total,
      labor_total,
      extra_charges_total,
      new_total,
    } = payload;

    const supabase = getServiceClient();
    const { data: service, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', service_id)
      .maybeSingle();

    if (error) throw error;
    if (!service) return jsonResponse({ error: 'Service not found' }, 404);

    const { data: notification, error: notifError } = await supabase
      .from('client_notifications')
      .insert({
        client_id: service.client_id,
        client_email: service.created_by,
        type: 'extra_charges_pending',
        title: `Orçamento extra de ${provider_name}`,
        message: `${provider_name} solicitou um orçamento extra. Materiais: R$ ${Number(material_total).toFixed(2)}${labor_total ? ` + Mão de obra: R$ ${Number(labor_total).toFixed(2)}` : ''}. Revise e aprove ou rejeite a solicitação.`,
        service_id,
        service_number: service.service_number,
        provider_name,
        extra_total: extra_charges_total,
        new_total,
        is_read: false,
      })
      .select()
      .single();

    if (notifError) throw notifError;

    await supabase
      .from('service_requests')
      .update({
        extra_charges: {
          ...(service.extra_charges ?? {}),
          status: 'pending',
          provider_id,
          material_total,
          labor_total,
          extra_charges_total,
          new_total,
          requested_at: new Date().toISOString(),
          items: payload.items ?? [],
          labor: payload.labor ?? null,
          photos: payload.photos ?? [],
        },
      })
      .eq('id', service_id);

    return jsonResponse({ success: true, notification_id: notification.id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
