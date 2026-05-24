import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/internalInvoke.ts';
import { invokeInternalFunction } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const body = await req.json();
    const serviceRequest = body.event?.data ?? body.data ?? body;

    if (!serviceRequest?.provider_id) {
      return jsonResponse({ skipped: true });
    }

    const oldStatus = body.event?.old_data?.status ?? body.old_status;
    const justCompleted = oldStatus !== 'concluido' && serviceRequest.status === 'concluido';
    if (!justCompleted) return jsonResponse({ skipped: true });

    const supabase = getServiceClient();
    const { data: completedServices } = await supabase
      .from('service_requests')
      .select('rating_client')
      .eq('provider_id', serviceRequest.provider_id)
      .eq('status', 'concluido');

    const jobCount = completedServices?.length ?? 0;
    let totalRating = 0;
    let ratedCount = 0;

    for (const service of completedServices ?? []) {
      if (service.rating_client && Number(service.rating_client) > 0) {
        totalRating += Number(service.rating_client);
        ratedCount += 1;
      }
    }

    const averageRating = ratedCount > 0 ? totalRating / ratedCount : 5;

    await supabase.from('providers').update({
      total_jobs: jobCount,
      rating: parseFloat(averageRating.toFixed(1)),
      total_reviews: ratedCount,
    }).eq('id', serviceRequest.provider_id);

    await invokeInternalFunction('calculateProviderLevel', { provider_id: serviceRequest.provider_id });

    return jsonResponse({
      success: true,
      providerId: serviceRequest.provider_id,
      totalJobs: jobCount,
      averageRating: parseFloat(averageRating.toFixed(1)),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
