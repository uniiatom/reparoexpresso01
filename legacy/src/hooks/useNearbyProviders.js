import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const estimateArrivalTime = (distanceKm, avgSpeed = 30) => {
  const minutes = Math.ceil((distanceKm / avgSpeed) * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export function useNearbyProviders(latitude, longitude, serviceType, maxDistance = 20) {
  return useQuery({
    queryKey: ['nearby-providers', latitude, longitude, serviceType, maxDistance],
    queryFn: async () => {
      if (!latitude || !longitude) return [];

      const providers = await base44.entities.Provider.filter({
        is_approved: true,
        is_online: true,
      });

      // Filter providers by service type and calculate distances
      const nearby = providers
        .filter(p => 
          p.specialties && 
          Array.isArray(p.specialties) && 
          p.specialties.some(s => 
            s.toLowerCase().includes(serviceType.toLowerCase()) || 
            serviceType.toLowerCase().includes(s.toLowerCase())
          )
        )
        .map(p => ({
          ...p,
          distance: calculateDistance(
            latitude,
            longitude,
            p.latitude || 0,
            p.longitude || 0
          ),
        }))
        .filter(p => p.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);

      return nearby;
    },
    enabled: !!latitude && !!longitude && !!serviceType,
  });
}