import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    if (auth.user.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden: Admin access required' }, 403);
    }

    const { profession_id, latitude, longitude, max_distance = 20 } = await req.json();
    if (!profession_id || latitude === undefined || longitude === undefined) {
      return jsonResponse({ error: 'Missing required parameters' }, 400);
    }

    const { supabase } = auth;
    const { data: providers } = await supabase
      .from('providers')
      .select('*')
      .eq('is_approved', true)
      .eq('is_online', true);

    // `providers.specialties` não existe — habilidades reais vivem em
    // `provider_professions` (ver MIGRATION.md seção 0.1).
    const providerIds = (providers ?? []).map((p) => p.id);
    const { data: matchingRows } = providerIds.length
      ? await supabase
          .from('provider_professions')
          .select('provider_id')
          .eq('profession_id', profession_id)
          .in('provider_id', providerIds)
      : { data: [] as Array<{ provider_id: string }> };
    const matchingIds = new Set((matchingRows ?? []).map((r) => r.provider_id));
    const relevant = (providers ?? []).filter((p) => matchingIds.has(p.id));

    const { data: allRequests } = await supabase
      .from('service_requests')
      .select('provider_id, status')
      .order('created_at', { ascending: false })
      .limit(1000);

    const ranked = relevant.map((provider) => {
      const providerRequests = (allRequests ?? []).filter((r) => r.provider_id === provider.id);
      const totalAssigned = providerRequests.length;
      const totalCompleted = providerRequests.filter((r) => r.status === 'concluido').length;
      const rejected = providerRequests.filter((r) => r.status === 'cancelado').length;
      const rejectionRate = totalAssigned > 0 ? rejected / totalAssigned : 0;
      const acceptanceRate = 1 - rejectionRate;
      const rating = Number(provider.rating || 5);
      const distance = haversine(
        latitude,
        longitude,
        Number(provider.latitude || 0),
        Number(provider.longitude || 0),
      );

      if (distance > max_distance) return null;

      const score = (acceptanceRate * 0.6) + (rating / 5 * 0.4);
      return {
        provider_id: provider.id,
        name: provider.name,
        rating,
        total_jobs: totalCompleted,
        totalAssigned,
        rejectionRate: Math.round(rejectionRate * 100),
        acceptanceRate: Math.round(acceptanceRate * 100),
        distance: Math.round(distance * 10) / 10,
        score: Math.round(score * 100) / 100,
        photo_url: provider.photo_url,
      };
    }).filter(Boolean).sort((a, b) => (b?.score || 0) - (a?.score || 0));

    return jsonResponse({
      success: true,
      profession_id,
      ranked_providers: ranked,
      total_providers: ranked.length,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
