import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getGoogleMapsDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (apiKey) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lon1}&destinations=${lat2},${lon2}&key=${apiKey}&mode=driving`,
        { signal: AbortSignal.timeout(5000) },
      );
      const data = await res.json();
      if (data?.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        return {
          distance: element.distance?.value || 0,
          duration: Math.max(1, Math.round(element.duration?.value / 60)),
        };
      }
    }
  } catch { /* fallback */ }

  const dist = haversineDistance(lat1, lon1, lat2, lon2);
  return {
    distance: Math.round(dist * 1000),
    duration: Math.max(2, Math.round((dist * 1.3 / 50) * 60)),
  };
}

async function optimizeRoute(
  services: Array<Record<string, unknown>>,
  providerLat: number,
  providerLon: number,
) {
  if (services.length <= 1) return { services, summary: { totalServices: services.length, totalDistance: 0, totalDuration: 0, estimatedTimeText: '0m' } };

  type Point = { id: string; lat: number; lon: number; service?: Record<string, unknown> };
  const points: Point[] = [
    { id: 'start', lat: providerLat, lon: providerLon },
    ...services.map((s) => ({
      id: String(s.id),
      lat: Number(s.client_latitude || s.latitude || 0),
      lon: Number(s.client_longitude || s.longitude || 0),
      service: s,
    })),
  ];

  const visited = new Set(['start']);
  const route = ['start'];
  let current = points[0];

  while (visited.size < points.length) {
    let nearest: Point | null = null;
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
    } else break;
  }

  const optimizedServices: Array<Record<string, unknown>> = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 1; i < route.length; i++) {
    const p = points.find((pt) => pt.id === route[i]);
    if (p?.service) {
      const prevP = points.find((pt) => pt.id === route[i - 1])!;
      const routeData = await getGoogleMapsDistance(prevP.lat, prevP.lon, p.lat, p.lon);
      totalDistance += routeData.distance;
      totalDuration += routeData.duration;
      optimizedServices.push({
        ...p.service,
        order: i,
        estimatedDurationFromPrevious: routeData.duration,
        estimatedDistanceFromPrevious: Math.round(routeData.distance / 1000 * 10) / 10,
        cumulativeDistance: Math.round(totalDistance / 1000 * 10) / 10,
        cumulativeDuration: totalDuration,
      });
    }
  }

  return {
    services: optimizedServices,
    summary: {
      totalServices: optimizedServices.length,
      totalDistance: Math.round(totalDistance / 1000 * 10) / 10,
      totalDuration,
      estimatedTimeText: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`,
    },
  };
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { services, providerLat, providerLon } = await req.json();
    if (!services?.length) return jsonResponse({ optimized: [] });
    if (!providerLat || !providerLon) {
      return jsonResponse({ error: 'Provider location required' }, 400);
    }

    const result = await optimizeRoute(services, providerLat, providerLon);
    return jsonResponse({ optimized: result.services, summary: result.summary });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
