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
    
    // Filtrar prestadores que NÃO estão em execução (em_andamento)
    let allServices = await base44.asServiceRole.entities.ServiceRequest.list();
    const providersInExecution = new Set();
    
    allServices.forEach(sr => {
      if (sr.status === 'em_andamento' && sr.provider_id) {
        providersInExecution.add(sr.provider_id);
      }
    });
    
    // Remove prestadores que já estão executando outro serviço
    providers = providers.filter(p => !providersInExecution.has(p.id));
    
    console.log(`Found ${providers.length} total providers (${providersInExecution.size} em execução excluídos)`);

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

    // Mapeamento service_type (snake_case) → labels das especialidades do prestador
    const SPECIALTY_MAP = {
      eletrica: ['Elétrica', 'Eletrica'],
      hidraulica: ['Hidráulica', 'Hidraulica'],
      pintura: ['Pintura'],
      montagem: ['Montagem'],
      reparo_geral: ['Reparo Geral'],
      alvenaria: ['Alvenaria'],
      fechadura: ['Fechadura / Serralheria', 'Fechadura', 'Serralheria'],
      ar_condicionado: ['Ar Condicionado'],
      limpeza_caixa_dagua: ["Limpeza Caixa d'Água", 'Limpeza Caixa de Agua', 'Limpeza Caixa dagua'],
      limpeza_calha: ['Limpeza de Calha', 'Limpeza Calha'],
      substituicao_telha: ['Substituição de Telha', 'Substituicao de Telha'],
      limpeza_telhado: ['Limpeza de Telhado', 'Limpeza Telhado'],
      instalacao_coifa_parede: ['Coifa de Parede', 'Instalação Coifa Parede'],
      instalacao_coifa_ilha: ['Coifa Ilha', 'Instalação Coifa Ilha'],
      conversao_vaso_coplado: ['Conversão Vaso CX Acoplada', 'Conversao Vaso Acoplado'],
      instalacao_vaso_monobloco: ['Vaso Monobloco', 'Instalação Vaso Monobloco'],
      reparo_forro_gesso: ['Reparo Forro de Gesso', 'Forro de Gesso'],
      desentupimento: ['Desentupimento'],
      troca_pneu: ['Troca de Pneu', 'Troca Pneu'],
      recarga_bateria: ['Recarga de Bateria', 'Recarga Bateria'],
      conserto_pneu: ['Conserto de Pneu', 'Conserto Pneu'],
      reboque: ['Reboque'],
      veiculo_outros: ['Veículo Outros', 'Veiculo Outros'],
      caca_vazamento: ['Caça Vazamento', 'Caca Vazamento'],
      checkup: ['Check-up', 'Checkup'],
      portao_eletronico: ['Portão Eletrônico', 'Portao Eletronico'],
      interfone: ['Interfone'],
      rejunte: ['Rejunte'],
      pressurizador: ['Pressurizador'],
      alarme_cerca_eletrica: ['Alarme / Cerca Elétrica', 'Alarme', 'Cerca Elétrica'],
      concertina: ['Concertina'],
      camera_cftv: ['Câmera / CFTV', 'Camera CFTV', 'CFTV'],
      instalacao_suporte_tv: ['Instalação Suporte TV', 'Suporte TV'],
      outros: ['Outros'],
    };

    // Filtrar por especialidade - obrigatório
    if (serviceRequest.service_type) {
      const validLabels = SPECIALTY_MAP[serviceRequest.service_type] || [serviceRequest.service_type];
      const filtered = providers.filter(p => {
        if (!p.specialties || !Array.isArray(p.specialties)) return false;
        return p.specialties.some(s => validLabels.includes(s));
      });
      console.log(`Found ${filtered.length} providers with specialty: ${serviceRequest.service_type} (looking for: ${validLabels.join(', ')})`);

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