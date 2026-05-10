import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Calcula distância entre dois pontos via Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // raio da terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Calcula distância e duração via Google Maps Distance Matrix API
async function getGoogleMapsDistance(lat1, lon1, lat2, lon2) {
  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY não configurada');
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lon1}&destinations=${lat2},${lon2}&key=${apiKey}&mode=driving`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    
    if (data?.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance?.value || 0, // em metros
        duration: Math.max(1, Math.round(element.duration?.value / 60)), // em minutos
      };
    }
  } catch (e) {
    console.warn('[GoogleMaps] fallback:', e.message);
  }

  // Fallback: OSRM se Google Maps falhar
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data?.routes?.[0]) {
      return {
        distance: Math.round(data.routes[0].distance * 1000),
        duration: Math.max(1, Math.round(data.routes[0].duration / 60)),
      };
    }
  } catch (e) {
    console.warn('[OSRM] fallback:', e.message);
  }

  // Fallback final: Haversine + estimativa de velocidade
  const dist = haversineDistance(lat1, lon1, lat2, lon2);
  return {
    distance: Math.round(dist * 1000),
    duration: Math.max(2, Math.round((dist * 1.3 / 50) * 60)),
  };
}

async function getRoadDuration(lat1, lon1, lat2, lon2) {
  const result = await getGoogleMapsDistance(lat1, lon1, lat2, lon2);
  return result.duration;
}

// Nearest Neighbor + 2-opt optimization
async function optimizeRoute(services, providerLat, providerLon) {
  if (services.length <= 1) return services;

  const points = [
    { id: 'start', lat: providerLat, lon: providerLon },
    ...services.map(s => ({ id: s.id, lat: s.client_latitude || s.latitude, lon: s.client_longitude || s.longitude, service: s }))
  ];

  // Nearest Neighbor: começa da localização do prestador
  const visited = new Set(['start']);
  const route = ['start'];
  let current = points[0];

  while (visited.size < points.length) {
    let nearest = null;
    let minDist = Infinity;

    for (const p of points) {
      if (!visited.has(p.id)) {
        const dist = haversineDistance(current.lat, current.lon, p.lat, p.lon);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      }
    }

    if (nearest) {
      visited.add(nearest.id);
      route.push(nearest.id);
      current = nearest;
    }
  }

  // 2-opt improvement (reduz pontos de inversão)
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 100) {
    improved = false;
    iterations++;

    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const p1 = points.find(p => p.id === route[i]);
        const p2 = points.find(p => p.id === route[i + 1]);
        const p3 = points.find(p => p.id === route[j]);
        const p4 = points.find(p => p.id === route[j + 1]);

        if (!p1 || !p2 || !p3 || !p4) continue;

        const d1 = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
        const d2 = haversineDistance(p3.lat, p3.lon, p4.lat, p4.lon);
        const d3 = haversineDistance(p1.lat, p1.lon, p3.lat, p3.lon);
        const d4 = haversineDistance(p2.lat, p2.lon, p4.lat, p4.lon);

        if (d3 + d4 < d1 + d2) {
          // Inverte a seção entre i+1 e j
          const newRoute = [...route.slice(0, i + 1), ...route.slice(i + 1, j + 1).reverse(), ...route.slice(j + 1)];
          route.splice(0, route.length, ...newRoute);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // Monta resultado com distâncias e durações reais via Google Maps
  const optimizedServices = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 1; i < route.length; i++) {
    const p = points.find(p => p.id === route[i]);
    if (p?.service) {
      const prevP = points.find(p => p.id === route[i - 1]);
      const routeData = await getGoogleMapsDistance(prevP.lat, prevP.lon, p.lat, p.lon);
      
      totalDistance += routeData.distance;
      totalDuration += routeData.duration;

      optimizedServices.push({
        ...p.service,
        order: i,
        estimatedDurationFromPrevious: routeData.duration,
        estimatedDistanceFromPrevious: Math.round(routeData.distance / 1000 * 10) / 10, // em km
        cumulativeDistance: Math.round(totalDistance / 1000 * 10) / 10,
        cumulativeDuration: totalDuration
      });
    }
  }

  return {
    services: optimizedServices,
    summary: {
      totalServices: optimizedServices.length,
      totalDistance: Math.round(totalDistance / 1000 * 10) / 10, // em km
      totalDuration: totalDuration, // em minutos
      estimatedTimeText: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
    }
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { services, providerLat, providerLon } = await req.json();

    if (!services || services.length === 0) {
      return Response.json({ optimized: [] });
    }

    if (!providerLat || !providerLon) {
      return Response.json({ error: 'Provider location required' }, { status: 400 });
    }

    const result = await optimizeRoute(services, providerLat, providerLon);

    return Response.json({
      optimized: result.services,
      summary: result.summary
    });
  } catch (error) {
    console.error('[optimizeRouteV2]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});