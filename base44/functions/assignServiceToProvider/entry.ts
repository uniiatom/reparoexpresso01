import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { request_id, auto_assign = false } = await req.json();

    if (!request_id) {
      return Response.json({ error: 'Missing request_id' }, { status: 400 });
    }

    // Fetch service request
    const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: request_id });
    const serviceRequest = requests[0];

    if (!serviceRequest) {
      return Response.json({ error: 'Service request not found' }, { status: 404 });
    }

    let provider_id = null;

    if (auto_assign) {
      // Get ranked providers using the ranking function
      const rankRes = await base44.asServiceRole.functions.invoke('rankProvidersForService', {
        service_type: serviceRequest.service_type,
        latitude: serviceRequest.latitude || -23.5505,
        longitude: serviceRequest.longitude || -46.6333,
        max_distance: 20
      });

      if (rankRes.ranked_providers && rankRes.ranked_providers.length > 0) {
        // Assign to the highest-ranked provider
        provider_id = rankRes.ranked_providers[0].provider_id;
      } else {
        return Response.json({ error: 'No qualified providers found' }, { status: 404 });
      }
    } else {
      const { provider_id: manual_provider_id } = await req.json();
      if (!manual_provider_id) {
        return Response.json({ error: 'Missing provider_id for manual assignment' }, { status: 400 });
      }
      provider_id = manual_provider_id;
    }

    // Update service request with provider assignment
    const updated = await base44.asServiceRole.entities.ServiceRequest.update(request_id, {
      provider_id,
      status: 'aceito'
    });

    // Fetch provider details for notification
    const providers = await base44.asServiceRole.entities.Provider.filter({ id: provider_id });
    const provider = providers[0];

    console.log(`[Service Assignment] Request ${request_id} assigned to provider ${provider_id} (${provider?.name}) - Auto: ${auto_assign}`);

    return Response.json({
      success: true,
      request_id,
      provider_id,
      provider_name: provider?.name,
      auto_assigned: auto_assign,
      message: `Serviço atribuído a ${provider?.name}`
    });

  } catch (error) {
    console.error('[Service Assignment Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});