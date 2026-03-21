import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { request_id, provider_id } = await req.json();

    if (!request_id || !provider_id) {
      return Response.json({ error: 'Missing request_id or provider_id' }, { status: 400 });
    }

    // Update service request with provider assignment
    const updated = await base44.asServiceRole.entities.ServiceRequest.update(request_id, {
      provider_id,
      status: 'aceito'
    });

    // Fetch provider details for notification
    const providers = await base44.asServiceRole.entities.Provider.filter({ id: provider_id });
    const provider = providers[0];

    console.log(`[Service Assignment] Request ${request_id} assigned to provider ${provider_id} (${provider?.name})`);

    return Response.json({
      success: true,
      request_id,
      provider_id,
      provider_name: provider?.name,
      message: `Serviço atribuído a ${provider?.name}`
    });

  } catch (error) {
    console.error('[Service Assignment Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});