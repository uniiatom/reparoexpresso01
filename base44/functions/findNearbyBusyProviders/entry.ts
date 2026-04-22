import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { service_request_id, client_latitude, client_longitude, service_type, client_name } = await req.json();

    if (!service_request_id || !client_latitude || !client_longitude || !service_type) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Busca prestadores aprovados, online e próximos
    const providers = await base44.entities.Provider.filter({ is_approved: true, is_blocked: false, is_online: true });
    
    // Calcula distância e filtra prestadores próximos (até 10km)
    const nearbyProviders = providers.filter(p => {
      // Se não tem localização, ignora
      if (!p.latitude || !p.longitude) return false;
      
      // Calcula distância simples (Haversine)
      const R = 6371;
      const dLat = (p.latitude - client_latitude) * Math.PI / 180;
      const dLon = (p.longitude - client_longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(client_latitude*Math.PI/180)*Math.cos(p.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      
      // Retorna prestadores a até 10km de distância
      return distance <= 10;
    });

    // Ordena por distância (mais próximos primeiro)
    const allServices = await base44.entities.ServiceRequest.list('-created_date', 1000);
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
    
    // Prioriza prestadores em atendimento (mais rápidos), depois os online
    const providersInService = allServices.filter(s => 
      s.status === 'em_andamento' && 
      s.service_type === service_type && 
      sortedByDistance.some(p => p.id === s.provider_id)
    );
    
    // Se não tem em atendimento, usa os online diretos
    const providersToNotify = providersInService.length > 0 ? providersInService : sortedByDistance.slice(0, 5);

    // Cria alertas para cada prestador encontrado (máx 5)
    const alerts = [];
    const toProcess = providersInService.length > 0 
      ? providersInService.slice(0, 5)
      : sortedByDistance.slice(0, 5);
    
    for (const item of toProcess) {
      const provider = item.provider_id ? nearbyProviders.find(p => p.id === item.provider_id) : item;
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