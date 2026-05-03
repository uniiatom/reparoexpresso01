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

    // Se a OS já tem prestador atribuído ou status diferente de aguardando, não processar
    if (serviceRequest.provider_id || serviceRequest.status !== 'aguardando') {
      console.log(`Skipping: OS ${serviceRequest.id} já tem prestador ou status ${serviceRequest.status}`);
      return Response.json({ skipped: true });
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

    // Filtrar por especialidade - obrigatório
     if (serviceRequest.service_type) {
       const specialtyName = serviceRequest.service_type.toLowerCase().trim();
       const filtered = providers.filter(p => {
         if (!p.specialties || !Array.isArray(p.specialties)) return false;
         // Correspondência exata da especialidade
         return p.specialties.includes(specialtyName) || 
                p.specialties.some(s => s.toLowerCase() === specialtyName);
       });
       console.log(`Found ${filtered.length} providers for specialty: ${serviceRequest.service_type}`);

      if (filtered.length === 0) {
        console.log(`No providers with specialty ${serviceRequest.service_type}, cannot assign service`);
        return Response.json({ 
          success: false,
          message: `No providers available with skill: ${serviceRequest.service_type}`
        });
      }
      providers = filtered;
    } else {
      console.log('No service_type specified, cannot filter by specialty');
      return Response.json({ 
        success: false,
        message: 'Service type is required'
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

    // Selecionar prestador (com ou sem localização)
    let nearestProvider = null;

    // Se houver localização do serviço, calcular distância
    if (serviceRequest.latitude && serviceRequest.longitude) {
      let minDistance = Infinity;

      for (const provider of providers) {
        if (!provider.latitude || !provider.longitude) {
          // Se prestador não tem localização, usar como fallback
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
    }

    // Se não encontrou por distância, usar o primeiro prestador disponível
    if (!nearestProvider && providers.length > 0) {
      nearestProvider = providers[0];
      console.log('Using first available provider');
    }

    if (!nearestProvider) {
      console.log('No provider available');
      return Response.json({ 
        success: false,
        message: 'No provider available'
      });
    }

    // Serviços agendados ficam com status 'agendado' — não disparam alerta imediato
    const isScheduled = serviceRequest.modality === 'agendado';
    const updateData = {
      provider_id: nearestProvider.id,
      provider_name: nearestProvider.name,
      provider_phone: nearestProvider.phone,
      status: isScheduled ? 'agendado' : 'aguardando'
    };
    if (isScheduled) {
      console.log(`Service ${serviceRequest.id} is scheduled for ${serviceRequest.scheduled_date} — setting status to agendado`);
    }
    
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