import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const MIN_INTERVAL_MS = 10000; // mínimo 10s entre updates
const MIN_DISTANCE_M = 5;      // só atualiza se moveu > 5 metros

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocationTracker({ requestId, active }) {
  const watchId = useRef(null);
  const lastUpdate = useRef(0);
  const lastPos = useRef(null);

  useEffect(() => {
    if (!active || !requestId || !navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const { latitude, longitude } = pos.coords;

        // Throttle por tempo
        if (now - lastUpdate.current < MIN_INTERVAL_MS) return;

        // Throttle por distância
        if (lastPos.current) {
          const dist = haversineMeters(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
          if (dist < MIN_DISTANCE_M) return;
        }

        lastUpdate.current = now;
        lastPos.current = { lat: latitude, lng: longitude };

        base44.entities.ServiceRequest.update(requestId, {
          client_latitude: latitude,
          client_longitude: longitude,
        });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 15000 }
    );

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active, requestId]);

  return null;
}