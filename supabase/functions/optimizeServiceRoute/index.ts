import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  return haversineDistance(lat1, lon1, lat2, lon2);
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

    const supabase = getServiceClient();
    const { data: allRequests } = await supabase
      .from('service_requests')
      .select('*')
      .eq('modality', 'agendado')
      .eq('status', 'aguardando');

    const { data: allProviders } = await supabase
      .from('providers')
      .select('*')
      .eq('is_approved', true)
      .eq('is_online', true);

    const groupedByDateCity: Record<string, Array<Record<string, unknown>>> = {};
    for (const r of allRequests ?? []) {
      const key = `${r.scheduled_date}_${r.city}`;
      if (!groupedByDateCity[key]) groupedByDateCity[key] = [];
      groupedByDateCity[key].push(r);
    }

    const assignments: Array<Record<string, unknown>> = [];

    for (const requests of Object.values(groupedByDateCity)) {
      if (requests.length < 2) continue;

      const sortedRequests = [...requests].sort((a, b) => {
        const timeA = a.scheduled_time ? parseInt(String(a.scheduled_time).replace(':', '')) : 0;
        const timeB = b.scheduled_time ? parseInt(String(b.scheduled_time).replace(':', '')) : 0;
        return timeA - timeB;
      });

      for (let i = 0; i < sortedRequests.length - 1; i++) {
        const current = sortedRequests[i];
        const candidates = sortedRequests.slice(i + 1).filter((r) => {
          if (r.service_type !== current.service_type) return false;
          const dist = calculateDistance(
            Number(current.latitude || 0),
            Number(current.longitude || 0),
            Number(r.latitude || 0),
            Number(r.longitude || 0),
          );
          return dist <= 3 && r.scheduled_date === current.scheduled_date;
        });

        if (!candidates.length) continue;

        const cluster = [current, ...candidates];
        const bestProvider = (allProviders ?? []).find((p) =>
          Array.isArray(p.specialties) &&
          p.specialties.some((s: string) =>
            s.toLowerCase().includes(String(current.service_type).toLowerCase())
          )
        );

        if (!bestProvider) continue;

        for (const reqItem of cluster) {
          assignments.push({
            request_id: reqItem.id,
            provider_id: bestProvider.id,
            provider_name: bestProvider.name,
            distance_km: calculateDistance(
              Number(reqItem.latitude || 0),
              Number(reqItem.longitude || 0),
              Number(bestProvider.latitude || 0),
              Number(bestProvider.longitude || 0),
            ),
            cluster_size: cluster.length,
          });
        }
      }
    }

    return jsonResponse({
      success: true,
      total_groups: Object.keys(groupedByDateCity).length,
      total_requests: allRequests?.length ?? 0,
      optimized_assignments: assignments.length,
      assignments,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
