import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Navigation, Phone, MapPin, Clock } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const clientIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 45], iconAnchor: [15, 45], popupAnchor: [0, -40], shadowSize: [41, 41],
});

const providerIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [35, 50], iconAnchor: [17.5, 50], popupAnchor: [0, -45], shadowSize: [41, 41],
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateETA = (distanceKm) => {
  const minutes = Math.ceil((distanceKm / 30) * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

function FitBounds({ clientPos, providerPos }) {
  const map = useMap();
  useEffect(() => {
    if (clientPos && providerPos) {
      map.fitBounds([clientPos, providerPos], { padding: [60, 60] });
    } else if (clientPos) {
      map.setView(clientPos, 15);
    }
  }, [clientPos?.[0], clientPos?.[1], providerPos?.[0], providerPos?.[1]]);
  return null;
}

export default function TrackingMap() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const { data: request, refetch } = useQuery({
    queryKey: ['tracking-request', requestId],
    queryFn: async () => {
      const list = await base44.entities.ServiceRequest.filter({ id: requestId });
      return list[0];
    },
    refetchInterval: 5000,
    enabled: !!requestId,
  });

  const hasProvider = request?.provider_latitude && request?.provider_longitude;
  const hasClient = request?.latitude && request?.longitude;

  const clientPos = hasClient ? [request.latitude, request.longitude] : null;
  const providerPos = hasProvider ? [request.provider_latitude, request.provider_longitude] : null;

  const distance = (hasClient && hasProvider)
    ? calculateDistance(request.latitude, request.longitude, request.provider_latitude, request.provider_longitude)
    : null;
  const eta = distance != null ? estimateETA(distance) : null;

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-foreground text-lg">Prestador a caminho</h1>
          {request.provider_name && (
            <p className="text-sm text-muted-foreground">{request.provider_name}</p>
          )}
        </div>
        {request.provider_phone && (
          <a href={`https://wa.me/55${request.provider_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl gap-1">
              <Phone className="w-4 h-4" /> WhatsApp
            </Button>
          </a>
        )}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-around px-4 py-3 bg-primary/5 border-b border-primary/20">
        <div className="flex items-center gap-2 text-sm">
          <Navigation className="w-4 h-4 text-primary animate-pulse" />
          <span className="font-semibold text-foreground">
            {hasProvider ? 'Rastreando em tempo real' : 'Aguardando localização...'}
          </span>
        </div>
        {distance != null && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {distance.toFixed(1)} km
            </span>
            <span className="text-primary font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> ~{eta}
            </span>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1" style={{ minHeight: 400 }}>
        {clientPos ? (
          <MapContainer
            center={clientPos}
            zoom={14}
            style={{ height: '100%', width: '100%', minHeight: 400 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Cliente */}
            <Marker position={clientPos} icon={clientIcon}>
              <Popup>
                <p className="font-bold text-sm">Sua localização</p>
                <p className="text-xs text-muted-foreground">{request.address}</p>
              </Popup>
            </Marker>

            {/* Prestador */}
            {providerPos && (
              <>
                <Marker position={providerPos} icon={providerIcon}>
                  <Popup>
                    <p className="font-bold text-sm">{request.provider_name}</p>
                    <p className="text-xs text-green-600">🚗 A caminho</p>
                    {distance != null && (
                      <p className="text-xs mt-1">~{distance.toFixed(1)} km · {eta}</p>
                    )}
                  </Popup>
                </Marker>
                {/* Linha entre prestador e cliente */}
                <Polyline
                  positions={[providerPos, clientPos]}
                  color="#10b981"
                  weight={3}
                  opacity={0.6}
                  dashArray="8, 6"
                />
              </>
            )}

            <FitBounds clientPos={clientPos} providerPos={providerPos} />
          </MapContainer>
        ) : (
          <div className="flex-1 flex items-center justify-center p-10 text-center">
            <div>
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Localização do cliente não disponível</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      {!hasProvider && (
        <div className="px-4 py-3 bg-card border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            A localização do prestador aparecerá assim que ele iniciar o deslocamento
          </p>
        </div>
      )}
    </div>
  );
}