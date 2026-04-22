import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { service_request_id, client_latitude, client_longitude, service_type, client_name } = await req.json();

    if (!service_request_id || !client_latitude || !client_longitude || !service_type) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Busca todos os prestadores aprovados (online ou não)
    const allProviders = await base44.entities.Provider.filter({ is_approved: true, is_blocked: false });
    
    // Calcula distância e filtra prestadores próximos (até 10km)
    const nearbyProviders = allProviders.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      
      const R = 6371;
      const dLat = (p.latitude - client_latitude) * Math.PI / 180;
      const dLon = (p.longitude - client_longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(client_latitude*Math.PI/180)*Math.cos(p.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      
      return distance <= 10;
    });

    // Busca serviços em andamento próximos
    const allServices = await base44.entities.ServiceRequest.filter({ status: 'em_andamento' });
    
    // Ordena por distância
    const sortedByDistance = nearbyProviders.sort((a, b) => {
      const R = 6371;
      const distA = R * 2 * Math.asin(Math.sqrt(
        Math.sin((a.latitude - client_latitude) * Math.PI / 360)**2 + 
        Math.cos(client_latitude * Math.PI / 180) * Math.cos(a.latitude * Math.PI / 180) * 
        Math.sin((a.longitude - client_longitude) * Math.PI / 360)**2
      ));
      const distB = R * 2 * Math.asin(Math.sqrt(
        Math.sin((b.latitude - client_latitude) * Math.PI / 360)**2 + 
        Math.cos(client_latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * 
        Math.sin((b.longitude - client_longitude) * Math.PI / 360)**2
      ));
      return distA - distB;
    });
    
    // Prioriza prestadores em atendimento (do mesmo tipo de serviço)
    const providersInService = allServices.filter(s => 
      s.service_type === service_type && 
      sortedByDistance.some(p => p.id === s.provider_id)
    );
    
    // Combina: primeiro os em atendimento, depois os online próximos (máx 5 total)
    const providersOnline = sortedByDistance.filter(p => p.is_online);
    const toProcess = [
      ...providersInService.slice(0, 3).map(s => ({ ...nearbyProviders.find(p => p.id === s.provider_id), _inService: true })),
      ...providersOnline.filter(p => !providersInService.find(s => s.provider_id === p.id)).slice(0, 2)
    ];

    const alerts = [];
    
    for (const provider of toProcess) {
      if (!provider) continue;

      const distance = Math.round(
        6371 * 2 * Math.asin(Math.sqrt(
          Math.sin((provider.latitude - client_latitude) * Math.PI / 360)**2 + 
          Math.cos(client_latitude * Math.PI / 180) * Math.cos(provider.latitude * Math.PI / 180) * 
          Math.sin((provider.longitude - client_longitude) * Math.PI / 360)**2
        )) * 10
      ) / 10;

      try {
        const alert = await base44.entities.ProviderBusyAlert.create({
          service_request_id,
          client_name,
          client_latitude,
          client_longitude,
          provider_id: provider.id,
          provider_name: provider.name,
          service_type,
          distance_km: distance,
          status: 'notificado',
          can_attend: false, // Padrão false até o prestador responder
          finish_time_minutes: 0, // Será preenchido pelo prestador
          expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
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