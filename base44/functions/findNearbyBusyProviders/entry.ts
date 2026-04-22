import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { service_request_id, client_latitude, client_longitude, service_type, client_name } = await req.json();

    if (!service_request_id || !client_latitude || !client_longitude || !service_type) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Busca APENAS serviços em andamento do mesmo tipo de serviço
    const busyServices = await base44.entities.ServiceRequest.filter({ status: 'em_andamento', service_type });
    
    if (busyServices.length === 0) {
      // Nenhum prestador ocupado desse tipo — retorna vazio
      return Response.json({ success: true, alerts_created: 0, alerts: [] });
    }

    // 2. Busca dados dos prestadores ocupados
    const providerIds = [...new Set(busyServices.map(s => s.provider_id))];
    const allProviders = await base44.entities.Provider.filter({ is_approved: true, is_blocked: false });
    const busyProviders = allProviders.filter(p => providerIds.includes(p.id) && p.latitude && p.longitude);

    // 3. Calcula distância e ordena (até 10km)
    const nearby = busyProviders
      .map(p => {
        const R = 6371;
        const dLat = (p.latitude - client_latitude) * Math.PI / 180;
        const dLon = (p.longitude - client_longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(client_latitude*Math.PI/180)*Math.cos(p.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return { ...p, distance };
      })
      .filter(p => p.distance <= 10)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5); // Máx 5

    const toProcess = nearby;
    const alerts = [];
    
    for (const provider of toProcess) {
      if (!provider) continue;

      try {
        const alert = await base44.entities.ProviderBusyAlert.create({
          service_request_id,
          client_name,
          client_latitude,
          client_longitude,
          provider_id: provider.id,
          provider_name: provider.name,
          service_type,
          distance_km: Math.round(provider.distance * 10) / 10,
          status: 'notificado',
          can_attend: false,
          finish_time_minutes: 0,
          expires_at: new Date(Date.now() + 5 * 60000).toISOString(), // 5 min
        });
        alerts.push(alert);
      } catch (e) {
        console.error(`Erro criando alerta para prestador ${provider.id}:`, e);
      }
    }

    return Response.json({ 
      success: true,
      alerts_created: alerts.length,
      alerts 
    });
  } catch (error) {
    console.error('Erro em findNearbyBusyProviders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});