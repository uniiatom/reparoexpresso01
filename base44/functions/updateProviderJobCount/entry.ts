import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    // Só processa quando serviço é marcado como concluído
    if (event.type !== 'update' || !event.data?.provider_id) {
      return Response.json({ skipped: true }, { status: 200 });
    }

    const serviceRequest = event.data;
    const oldData = event.old_data;

    // Verifica se o status mudou para concluído agora
    const justCompleted = oldData?.status !== 'concluido' && serviceRequest.status === 'concluido';
    if (!justCompleted) {
      return Response.json({ skipped: true }, { status: 200 });
    }

    // Busca o prestador
    const provider = await base44.entities.Provider.get(serviceRequest.provider_id);
    if (!provider) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Conta quantos serviços concluídos este prestador tem
    const completedServices = await base44.entities.ServiceRequest.filter({
      provider_id: serviceRequest.provider_id,
      status: 'concluido',
    }, '-created_date');

    const jobCount = completedServices.length;

    // Atualiza total_jobs e calcula média de ratings
    let totalRating = 0;
    let ratedCount = 0;

    for (const service of completedServices) {
      if (service.rating_client && service.rating_client > 0) {
        totalRating += service.rating_client;
        ratedCount += 1;
      }
    }

    const averageRating = ratedCount > 0 ? totalRating / ratedCount : 5;

    // Atualiza provider
    await base44.entities.Provider.update(serviceRequest.provider_id, {
      total_jobs: jobCount,
      rating: parseFloat(averageRating.toFixed(1)),
      total_reviews: ratedCount,
    });

    console.log(`[updateProviderJobCount] Provider ${provider.name}: ${jobCount} jobs, ${averageRating.toFixed(1)}⭐`);

    return Response.json({
      success: true,
      providerId: serviceRequest.provider_id,
      totalJobs: jobCount,
      averageRating: parseFloat(averageRating.toFixed(1)),
    });
  } catch (error) {
    console.error('[updateProviderJobCount]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});