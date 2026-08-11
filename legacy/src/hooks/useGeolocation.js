import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocoding via nominatim (free, no key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address;
          const street = addr.road || addr.street || '';
          const number = addr.house_number ? `, ${addr.house_number}` : '';
          const neighbourhood = addr.suburb || addr.neighbourhood || addr.quarter || '';
          const city = addr.city || addr.town || addr.village || '';
          const state = addr.state || '';
          setLocation({
            latitude,
            longitude,
            address: `${street}${number}${neighbourhood ? `, ${neighbourhood}` : ''}`,
            city,
            state,
            full: data.display_name,
          });
        } catch {
          setLocation({ latitude, longitude, address: '', city: '', state: '' });
        }
        setLoading(false);
      },
      (err) => {
        setError('Não foi possível obter sua localização. Verifique as permissões.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { location, loading, error, getLocation };
}