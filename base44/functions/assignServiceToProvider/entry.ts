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

    // Buscar prestadores online ou aprovados
    let providers = await base44.asServiceRole.entities.Provider.list();

    console.log(`Found ${providers.length} total providers`);

    if (!providers || providers.length === 0) {
      console.log('No providers found in database');
      return Response.json({ 
        success: false,
        message: 'No providers found'
      });
    }

    // Priorizar prestadores online
    let onlineProviders = providers.filter(p => p.is_online === true);
    console.log(`Found ${onlineProviders.length} online providers`);
    
    if (onlineProviders.length > 0) {
      providers = onlineProviders;
    }

    // Filtrar por especialidade se existir
    if (serviceRequest.service_type) {
      const specialtyName = serviceRequest.service_type;
      const filtered = providers.filter(p => {
        if (!p.specialties || !Array.isArray(p.specialties)) return false;
        // Comparar lowercase para evitar diferenças de maiúsculas
        return p.specialties.some(s => 
          s.toLowerCase().includes(specialtyName.toLowerCase()) || 
          specialtyName.toLowerCase().includes(s.toLowerCase())
        );
      });
      console.log(`Found ${filtered.length} providers for specialty: ${serviceRequest.service_type}`);
      if (filtered.length > 0) {
        providers = filtered;
      } else {
        console.log('No providers with matching specialty, using all online providers');
      }
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

    // Se não houver localização do serviço, pegar primeiro prestador
    if (!serviceRequest.latitude || !serviceRequest.longitude) {
      console.log('Service has no location, assigning first provider');
      const nearestProvider = providers[0];
      
      const updateData = {
        provider_id: nearestProvider.id,
        provider_name: nearestProvider.name,
        provider_phone: nearestProvider.phone,
        status: 'aceito'
      };
      
      await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, updateData);
      return Response.json({ 
        success: true,
        provider_id: nearestProvider.id,
        provider_name: nearestProvider.name
      });
    }

    // Calcular distância e encontrar o prestador mais próximo
    let nearestProvider = null;
    let minDistance = Infinity;

    for (const provider of providers) {
      if (!provider.latitude || !provider.longitude) {
        // Se prestador não tem localização, usar mesmo assim como fallback
        if (!nearestProvider) nearestProvider = provider;
        continue;
      }
      
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
      console.log('No provider found');
      return Response.json({ 
        success: false,
        message: 'No provider available'
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