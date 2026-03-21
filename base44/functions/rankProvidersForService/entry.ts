import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { service_type, latitude, longitude, max_distance = 20 } = await req.json();

    if (!service_type || latitude === undefined || longitude === undefined) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch all providers with their specialties
    const providers = await base44.asServiceRole.entities.Provider.filter({ is_approved: true, is_online: true });
    
    // Filter providers by specialty
    const relevantProviders = providers.filter(p => 
      p.specialties && p.specialties.includes(service_type)
    );

    // Fetch all service requests to calculate rejection rates
    const allRequests = await base44.asServiceRole.entities.ServiceRequest.list('-created_date', 1000);
    
    // Calculate provider metrics
    const providerMetrics = relevantProviders.map(provider => {
      const providerRequests = allRequests.filter(r => r.provider_id === provider.id);
      const totalAssigned = providerRequests.length;
      const rejected = providerRequests.filter(r => r.status === 'cancelado').length;
      
      const rejectionRate = totalAssigned > 0 ? rejected / totalAssigned : 0;
      const acceptanceRate = 1 - rejectionRate;
      const rating = provider.rating || 5;
      
      // Calculate distance
      const R = 6371;
      const dLat = (provider.latitude - latitude) * Math.PI / 180;
      const dLon = (provider.longitude - longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + 
                Math.cos(latitude*Math.PI/180)*Math.cos(provider.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      // Only include providers within max distance
      if (distance > max_distance) {
        return null;
      }

      // Scoring: 60% acceptance rate + 40% rating (5 star scale)
      const score = (acceptanceRate * 0.6) + (rating / 5 * 0.4);

      return {
        provider_id: provider.id,
        name: provider.name,
        rating,
        total_jobs: provider.total_jobs || 0,
        totalAssigned,
        rejectionRate: Math.round(rejectionRate * 100),
        acceptanceRate: Math.round(acceptanceRate * 100),
        distance: Math.round(distance * 10) / 10,
        score: Math.round(score * 100) / 100,
        photo_url: provider.photo_url,
      };
    }).filter(p => p !== null);

    // Sort by score (highest first)
    const rankedProviders = providerMetrics.sort((a, b) => b.score - a.score);

    console.log(`[Provider Ranking] Found ${rankedProviders.length} qualified providers for ${service_type}`);

    return Response.json({
      success: true,
      service_type,
      ranked_providers: rankedProviders,
      total_providers: rankedProviders.length,
    });

  } catch (error) {
    console.error('[Provider Ranking Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});