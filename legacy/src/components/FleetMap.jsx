import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Star, X, Truck, Bike, Car, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Detecta tipo de veículo pela especialidade do prestador
function getVehicleType(provider) {
  const specs = (provider.specialties || []).map(s => s.toLowerCase()).join(' ');
  if (specs.includes('reboque') || specs.includes('guincho')) return 'reboque';
  if (specs.includes('moto') || specs.includes('motocicleta')) return 'moto';
  return 'fiorino';
}

function makeIcon(emoji, color) {
  return new L.DivIcon({
    html: `<div style="
      background:${color};
      border:3px solid white;
      border-radius:50%;
      width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      font-size:17px;
      box-shadow:0 3px 10px rgba(0,0,0,0.35);
      cursor:pointer;
    ">${emoji}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const ICONS = {
  fiorino: makeIcon('🚐', '#1d4ed8'),
  reboque: makeIcon('🚛', '#b45309'),
  moto:    makeIcon('🏍️', '#15803d'),
};

const clientIcon = new L.DivIcon({
  html: `<div style="background:#6366f1;border:3px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center]);
  return null;
}

const VEHICLE_LABELS = {
  fiorino: { label: 'Fiorino', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-600' },
  reboque: { label: 'Reboque', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-600' },
  moto:    { label: 'Moto',    color: 'bg-green-100 text-green-700', dot: 'bg-green-600' },
};

export default function FleetMap({ onClose }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setLocationError(true)
    );
  }, []);

  const { data: providers = [], refetch, isFetching } = useQuery({
    queryKey: ['fleet-map-providers'],
    queryFn: async () => {
      const data = await base44.entities.Provider.filter({ is_online: true, is_approved: true });
      setLastUpdate(new Date());
      return data;
    },
    refetchInterval: 15000,
  });

  const onlineWithLocation = providers.filter(p => p.latitude && p.longitude);

  const counts = { fiorino: 0, reboque: 0, moto: 0 };
  onlineWithLocation.forEach(p => { counts[getVehicleType(p)]++; });

  const filtered = filter === 'all'
    ? onlineWithLocation
    : onlineWithLocation.filter(p => getVehicleType(p) === filter);

  const mapCenter = userLocation || [-23.5505, -46.6333];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div>
          <h2 className="font-bold text-foreground text-base flex items-center gap-2">
            🗺️ Frota em Tempo Real
          </h2>
          <p className="text-xs text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            title="Atualizar agora"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Contadores por tipo */}
      <div className="flex gap-2 px-4 py-2 bg-card border-b border-border overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
            filter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          Todos
          <span className="bg-white/20 rounded-full px-1.5">{onlineWithLocation.length}</span>
        </button>
        {(['fiorino', 'reboque', 'moto']).map(type => {
          const v = VEHICLE_LABELS[type];
          const emojis = { fiorino: '🚐', reboque: '🚛', moto: '🏍️' };
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filter === type ? `${v.color} border-current` : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {emojis[type]} {v.label}
              <span className="font-black">{counts[type]}</span>
            </button>
          );
        })}
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

          {userLocation && (
            <Marker position={userLocation} icon={clientIcon}>
              <Popup>
                <div className="text-center text-sm font-semibold">📍 Sua localização</div>
              </Popup>
            </Marker>
          )}

          {filtered.map(provider => {
            const type = getVehicleType(provider);
            const emoji = { fiorino: '🚐', reboque: '🚛', moto: '🏍️' }[type];
            return (
              <Marker
                key={provider.id}
                position={[provider.latitude, provider.longitude]}
                icon={ICONS[type]}
              >
                <Popup>
                  <div className="min-w-[160px] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{emoji}</span>
                      <p className="font-bold text-sm text-gray-900">{provider.name}</p>
                    </div>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${VEHICLE_LABELS[type].color}`}>
                      {VEHICLE_LABELS[type].label}
                    </span>
                    {provider.specialties?.length > 0 && (
                      <p className="text-xs text-gray-500">{provider.specialties.slice(0, 3).join(' • ')}</p>
                    )}
                    <div className="flex items-center gap-1 pt-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-semibold">{provider.rating?.toFixed(1) || '5.0'}</span>
                      <span className="text-xs text-green-600 ml-2 font-bold">● Online</span>
                    </div>
                    {provider.phone && (
                      <a
                        href={`tel:${provider.phone}`}
                        className="block text-center text-xs font-bold text-blue-600 hover:underline pt-1"
                      >
                        📞 {provider.phone}
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legenda */}
      <div className="px-4 py-2.5 bg-card border-t border-border flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"></span> Você</div>
        <div className="flex items-center gap-1.5">🚐 Fiorino ({counts.fiorino})</div>
        <div className="flex items-center gap-1.5">🚛 Reboque ({counts.reboque})</div>
        <div className="flex items-center gap-1.5">🏍️ Moto ({counts.moto})</div>
        {locationError && <span className="text-destructive ml-auto">⚠ Localização indisponível</span>}
        {!userLocation && !locationError && <span className="animate-pulse ml-auto">Obtendo localização...</span>}
      </div>
    </div>
  );
}