import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Componente invisível que atualiza a localização em tempo real do cliente no banco.
 * Ativo apenas quando o serviço está em status aguardando/aceito/a_caminho/em_andamento.
 */
export default function LocationTracker({ requestId, active }) {
  const watchId = useRef(null);

  useEffect(() => {
    if (!active || !requestId || !navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        base44.entities.ServiceRequest.update(requestId, {
          client_latitude: pos.coords.latitude,
          client_longitude: pos.coords.longitude,
        });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active, requestId]);

  return null;
}