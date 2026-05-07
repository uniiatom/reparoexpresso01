import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Navigation, Star, Phone, Clock, Zap, MapPin, TrendingUp, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const clientIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [0, -40],
  shadowSize: [41, 41],
});

const selectedProviderIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [35, 50],
  iconAnchor: [17.5, 50],
  popupAnchor: [0, -45],
  shadowSize: [41, 41],
});

const otherProviderIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12.5, 41],
  popupAnchor: [0, -35],
  shadowSize: [41, 41],
});

function MapBounds({ providers, clientLocation, selectedProvider }) {
  const map = useMap();

  useEffect(() => {
    if (!clientLocation) return;

    const bounds = new LatLngBounds([clientLocation.latitude, clientLocation.longitude]);
    let hasMultiplePoints = false;

    if (selectedProvider && selectedProvider.latitude && selectedProvider.longitude) {
      bounds.extend([selectedProvider.latitude, selectedProvider.longitude]);
      hasMultiplePoints = true;
      providers.forEach(p => {
        if (p.latitude && p.longitude) bounds.extend([p.latitude, p.longitude]);
      });
    }

    // Only fitBounds if we have multiple points; otherwise just set center
    if (hasMultiplePoints && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([clientLocation.latitude, clientLocation.longitude], 13);
    }
  }, [providers, clientLocation, selectedProvider, map]);

  return null;
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const estimateArrivalTime = (distanceKm, avgSpeed = 30) => {
  const minutes = Math.ceil((distanceKm / avgSpeed) * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const openNavigation = (destLat, destLng, label = '') => {
  const encodedLabel = encodeURIComponent(label);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    // Tenta abrir Google Maps app, fallback para browser
    window.open(`https://maps.google.com/?daddr=${destLat},${destLng}&travelmode=driving`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=${encodedLabel}&travelmode=driving`, '_blank');
  }
};

export default function ProviderLocationMap() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [distanceFilter, setDistanceFilter] = useState(20);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const { data: request } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: async () => {
      const list = await base44.entities.ServiceRequest.filter({ id: requestId });
      return list[0];
    },
    enabled: !!requestId,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['map-nearby-providers', request?.latitude, request?.longitude],
    queryFn: async () => {
      if (!request?.latitude || !request?.longitude) return [];
      
      const allProviders = await base44.entities.Provider.filter({
        is_approved: true,
        is_online: true,
      });

      return allProviders
        .map(p => ({
          ...p,
          distance: calculateDistance(
            request.latitude,
            request.longitude,
            p.latitude || 0,
            p.longitude || 0
          ),
          eta: estimateArrivalTime(
            calculateDistance(
              request.latitude,
              request.longitude,
              p.latitude || 0,
              p.longitude || 0
            )
          ),
        }))
        .filter(p => p.distance <= 50)
        .sort((a, b) => a.distance - b.distance);
    },
    enabled: !!request?.latitude && !!request?.longitude,
  });

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Carregando dados do serviço...</p>
        </div>
      </div>
    );
  }

  // Redirect if service is in execution
  if (request.status === 'em_andamento') {
    navigate(`/acompanhar/${requestId}`);
    return null;
  }

  const filteredProviders = providers.filter(p => p.distance <= distanceFilter);
  const clientLocation = { latitude: request.latitude, longitude: request.longitude };

  return (
    <div className="min-h-screen bg-background max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Prestadores Próximos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 rounded-2xl overflow-hidden border border-border h-[600px] bg-muted"
        >
          <MapContainer center={[clientLocation.latitude, clientLocation.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Client location */}
            <Marker position={[clientLocation.latitude, clientLocation.longitude]} icon={clientIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">Sua Localização</p>
                  <p className="text-xs text-muted-foreground mt-1">{request.address}</p>
                </div>
              </Popup>
            </Marker>

            {/* Distance radius */}
            <CircleMarker
              center={[clientLocation.latitude, clientLocation.longitude]}
              radius={distanceFilter * 8}
              fill={false}
              color="#10b981"
              weight={2}
              opacity={0.2}
              dashArray="5, 5"
            />

            {/* Providers */}
            {filteredProviders.map((provider) => (
              <React.Fragment key={provider.id}>
                {/* Route line */}
                {selectedProvider?.id === provider.id && (
                  <Polyline
                    positions={[
                      [clientLocation.latitude, clientLocation.longitude],
                      [provider.latitude || 0, provider.longitude || 0],
                    ]}
                    color="#10b981"
                    weight={3}
                    opacity={0.7}
                    dashArray="10, 5"
                  />
                )}

                {/* Marker */}
                <Marker
                  position={[provider.latitude || 0, provider.longitude || 0]}
                  icon={selectedProvider?.id === provider.id ? selectedProviderIcon : otherProviderIcon}
                  onClick={() => setSelectedProvider(provider)}
                >
                  <Popup>
                    <div className="text-sm w-56">
                      <p className="font-bold">{provider.name}</p>
                      <div className="flex items-center gap-1 my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < Math.floor(provider.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                        ))}
                        <span className="text-xs ml-1">{provider.rating?.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{provider.city}, {provider.state}</p>
                      <div className="bg-green-50 rounded p-2 mb-2">
                        <p className="text-xs font-semibold text-green-700">📍 {provider.distance?.toFixed(1)} km</p>
                        <p className="text-xs text-green-600">⏱️ {provider.eta}</p>
                      </div>
                      {provider.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                          <Phone className="w-3 h-3" /> {provider.phone}
                        </p>
                      )}
                      <button
                        onClick={() => openNavigation(clientLocation.latitude, clientLocation.longitude, request.address)}
                        className="w-full flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Navigation className="w-3 h-3" /> Navegar até o cliente
                      </button>
                      </div>
                      </Popup>
                </Marker>
              </React.Fragment>
            ))}

            <MapBounds providers={filteredProviders} clientLocation={clientLocation} selectedProvider={selectedProvider} />
          </MapContainer>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Serviço Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Serviço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{request.address}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {request.city}, {request.state}
              </p>
            </CardContent>
          </Card>

          {/* Distance Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filtro de Distância</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="text-xs font-semibold text-foreground mb-3 block">
                Até {distanceFilter.toFixed(1)} km
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={distanceFilter}
                onChange={(e) => setDistanceFilter(parseFloat(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </CardContent>
          </Card>

          {/* Selected Provider Details */}
          {selectedProvider && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Prestador Selecionado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-bold text-foreground">{selectedProvider.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-3.5 h-3.5", i < Math.floor(selectedProvider.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                      ))}
                      <span className="text-xs text-muted-foreground">{selectedProvider.rating?.toFixed(1)} ({selectedProvider.total_reviews || 0})</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/50 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground">Distância</p>
                      <p className="font-bold text-sm text-primary">{selectedProvider.distance?.toFixed(1)} km</p>
                    </div>
                    <div className="bg-white/50 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground">ETA</p>
                      <p className="font-bold text-sm text-primary">{selectedProvider.eta}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full rounded-xl h-10 bg-primary text-primary-foreground font-bold"
                    onClick={() => openNavigation(clientLocation.latitude, clientLocation.longitude, request.address)}
                  >
                    <Navigation className="w-4 h-4 mr-2" /> Navegar até o cliente
                  </Button>

                  {selectedProvider.phone && (
                    <a href={`https://wa.me/55${selectedProvider.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="block">
                      <Button size="sm" variant="outline" className="w-full rounded-xl h-10">
                        <Phone className="w-4 h-4 mr-2" /> Contato WhatsApp
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Providers List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {filteredProviders.length} Prestador{filteredProviders.length !== 1 ? 'es' : ''} Encontrado{filteredProviders.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredProviders.length > 0 ? (
                  filteredProviders.map((provider) => (
                    <motion.button
                      key={provider.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedProvider(provider)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border-2 transition-all',
                        selectedProvider?.id === provider.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm text-foreground">{provider.name}</p>
                        <Badge variant="outline" className="text-xs">{provider.distance?.toFixed(1)} km</Badge>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-2.5 h-2.5", i < Math.floor(provider.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                        ))}
                        <span className="text-xs text-muted-foreground">{provider.rating?.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-primary font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {provider.eta}
                      </p>
                    </motion.button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum prestador encontrado nesta distância
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}