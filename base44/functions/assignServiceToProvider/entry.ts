import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Dados da solicitação de serviço criada
    const serviceRequest = data;
    
    if (!serviceRequest || event.type !== 'create') {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    // Buscar prestadores aprovados (não exigir online, pois pode não estar atualizado em tempo real)
    let providers = await base44.asServiceRole.entities.Provider.filter({
      is_approved: true
    });

    console.log(`Found ${providers.length} approved providers`);

    // Filtrar por especialidade
    if (serviceRequest.service_type) {
      providers = providers.filter(p => 
        p.specialties && p.specialties.includes(serviceRequest.service_type)
      );
      console.log(`Found ${providers.length} providers for specialty: ${serviceRequest.service_type}`);
    }

    if (!providers || providers.length === 0) {
      console.log(`No providers available for service: ${serviceRequest.service_type}`);
      return Response.json({ 
        success: false,
        message: 'No providers available for this service type'
      });
    }

    // Calcular distância e encontrar o prestador mais próximo
    const getDistance = (lat1, lon1, lat2, lon2) => {
      if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    let nearestProvider = null;
    let minDistance = Infinity;

    for (const provider of providers) {
      if (!provider.latitude || !provider.longitude) continue;
      
      const distance = getDistance(
        serviceRequest.latitude,
        serviceRequest.longitude,
        provider.latitude,
        provider.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestProvider = provider;
      }
    }

    if (!nearestProvider) {
      console.log('No provider with location found');
      return Response.json({ 
        success: false,
        message: 'No provider with valid location found'
      });
    }

    // Atualizar a solicitação com o prestador atribuído
    const updateData = {
      provider_id: nearestProvider.id,
      provider_name: nearestProvider.name,
      provider_phone: nearestProvider.phone,
      status: 'aceito'
    };
    
    if (nearestProvider.latitude) updateData.provider_latitude = nearestProvider.latitude;
    if (nearestProvider.longitude) updateData.provider_longitude = nearestProvider.longitude;
    
    await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, updateData);

    console.log(`Service ${serviceRequest.id} assigned to provider ${nearestProvider.id}`);

    return Response.json({ 
      success: true,
      provider_id: nearestProvider.id,
      provider_name: nearestProvider.name
    });

  } catch (error) {
    console.error('Error assigning service:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});