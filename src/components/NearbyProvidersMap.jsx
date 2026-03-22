import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Star, MapPin, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const providerIcon = new L.DivIcon({
  html: `<div style="background:#22c55e;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const clientIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center]);
  return null;
}

export default function NearbyProvidersMap({ onClose }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setLocationError(true)
    );
  }, []);

  const { data: providers = [] } = useQuery({
    queryKey: ['online-providers-map'],
    queryFn: () => base44.entities.Provider.filter({ is_online: true, is_approved: true }),
    refetchInterval: 15000,
  });

  const onlineWithLocation = providers.filter(p => p.latitude && p.longitude);

  // Default center: São Paulo if no user location yet
  const mapCenter = userLocation || [-23.5505, -46.6333];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div>
          <h2 className="font-bold text-foreground">Prestadores Próximos</h2>
          <p className="text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
            {onlineWithLocation.length} online agora
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && <RecenterMap center={userLocation} />}

          {/* User marker */}
          {userLocation && (
            <Marker position={userLocation} icon={clientIcon}>
              <Popup>
                <div className="text-center text-sm font-semibold">📍 Você está aqui</div>
              </Popup>
            </Marker>
          )}

          {/* Provider markers */}
          {onlineWithLocation.map(provider => (
            <Marker
              key={provider.id}
              position={[provider.latitude, provider.longitude]}
              icon={providerIcon}
            >
              <Popup>
                <div className="text-sm min-w-[140px]">
                  <p className="font-bold text-foreground mb-1">{provider.name}</p>
                  {provider.specialties?.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {provider.specialties.slice(0, 2).join(', ')}
                    </p>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-semibold">{provider.rating?.toFixed(1) || '5.0'}</span>
                    <span className="text-xs text-green-600 ml-2 font-semibold">● Online</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-card border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Você
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Prestador online
        </div>
        {!userLocation && !locationError && (
          <span className="text-muted-foreground animate-pulse">Obtendo sua localização...</span>
        )}
        {locationError && (
          <span className="text-destructive">Localização não disponível</span>
        )}
      </div>
    </div>
  );
}