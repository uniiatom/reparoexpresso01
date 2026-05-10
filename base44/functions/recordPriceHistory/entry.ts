import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      service_id,
      service_number,
      event_type,
      previous_price,
      new_price,
      extra_charges_total,
      reason,
      notes,
      status,
    } = await req.json();

    if (!service_id || !event_type || !new_price) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determina actor_type baseado no role
    const actor_type = user.role === 'admin' ? 'provider' : 'client';

    // Cria registro no histórico
    const history = await base44.entities.ServicePriceHistory.create({
      service_id,
      service_number: service_number || '',
      event_type,
      actor_type,
      actor_name: user.full_name || user.email,
      previous_price: previous_price || null,
      new_price,
      extra_charges_total: extra_charges_total || null,
      reason: reason || null,
      notes: notes || null,
      status: status || 'pending',
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true, history });
  } catch (error) {
    console.error('[recordPriceHistory]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});