import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all scheduled service requests
    const allRequests = await base44.entities.ServiceRequest.filter({
      modality: 'agendado',
      status: 'aguardando'
    });

    // Fetch all available providers
    const allProviders = await base44.entities.Provider.filter({
      is_approved: true,
      is_online: true
    });

    // Group requests by city and date
    const groupedByDateCity = {};
    allRequests.forEach(req => {
      const key = `${req.scheduled_date}_${req.city}`;
      if (!groupedByDateCity[key]) groupedByDateCity[key] = [];
      groupedByDateCity[key].push(req);
    });

    // For each group, find optimal provider assignments
    const assignments = [];

    for (const [key, requests] of Object.entries(groupedByDateCity)) {
      if (requests.length < 2) continue;

      // Sort by time
      const sortedRequests = requests.sort((a, b) => {
        const timeA = a.scheduled_time ? parseInt(a.scheduled_time.replace(':', '')) : 0;
        const timeB = b.scheduled_time ? parseInt(b.scheduled_time.replace(':', '')) : 0;
        return timeA - timeB;
      });

      // For each request, find nearby requests that could be done by the same provider
      for (let i = 0; i < sortedRequests.length - 1; i++) {
        const current = sortedRequests[i];
        const candidates = sortedRequests.slice(i + 1).filter(r => {
          // Same service type or compatible
          if (r.service_type !== current.service_type) return false;
          
          // Distance check
          const dist = calculateDistance(
            current.latitude || 0,
            current.longitude || 0,
            r.latitude || 0,
            r.longitude || 0
          );
          
          // Within 3km and same day
          return dist <= 3 && r.scheduled_date === current.scheduled_date;
        });

        if (candidates.length > 0) {
          // Find best provider for this cluster
          const cluster = [current, ...candidates];
          
          const bestProvider = allProviders.find(p => {
            if (!p.specialties || !Array.isArray(p.specialties)) return false;
            return p.specialties.some(s => 
              s.toLowerCase().includes(current.service_type.toLowerCase())
            );
          });

          if (bestProvider) {
            cluster.forEach(req => {
              assignments.push({
                request_id: req.id,
                provider_id: bestProvider.id,
                provider_name: bestProvider.name,
                distance_km: calculateDistance(
                  req.latitude || 0,
                  req.longitude || 0,
                  bestProvider.latitude || 0,
                  bestProvider.longitude || 0
                ),
                cluster_size: cluster.length,
                efficiency_score: cluster.length / Math.max(1, calculateDistance(
                  cluster[0].latitude || 0,
                  cluster[0].longitude || 0,
                  cluster[cluster.length - 1].latitude || 0,
                  cluster[cluster.length - 1].longitude || 0
                ))
              });
            });
          }
        }
      }
    }

    console.log(`[Service Route Optimization] Found ${assignments.length} potential assignments across ${Object.keys(groupedByDateCity).length} groups`);

    return Response.json({
      success: true,
      total_groups: Object.keys(groupedByDateCity).length,
      total_requests: allRequests.length,
      optimized_assignments: assignments.length,
      assignments: assignments
    });

  } catch (error) {
    console.error('[Service Route Optimization Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});