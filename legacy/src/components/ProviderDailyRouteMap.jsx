import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import RouteOptimizer from './RouteOptimizer';

// Ícones personalizados
const createNumberedIcon = (number, color = '#FF6B35') => {
  return L.divIcon({
    html: `<div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [32, 32],
    className: 'numbered-icon',
  });
};

const currentLocationIcon = L.divIcon({
  html: `<div style="
    background: #45B7D1;
    color: white;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  ">📍</div>`,
  iconSize: [36, 36],
  className: 'current-location-icon',
});

export default function ProviderDailyRouteMap({ providerId, currentLocation }) {
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch serviços do dia do prestador
  const { data: todaysServices = [] } = useQuery({
    queryKey: ['provider-daily-services', providerId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const services = await base44.entities.ServiceRequest.filter({
        provider_id: providerId,
        status: ['agendado', 'aceito', 'a_caminho', 'em_andamento'],
      }, 'scheduled_date', 100);
      return services.filter(s => 
        s.scheduled_date >= today && s.scheduled_date < tomorrow
      );
    },
    enabled: !!providerId,
  });

  // Otimiza rota quando há serviços
  useEffect(() => {
    const optimizeRoute = async () => {
      if (todaysServices.length === 0) {
        setOptimizedRoute(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await base44.functions.invoke('optimizeServiceRoute', {
          provider_id: providerId,
          services: todaysServices.map(s => ({
            id: s.id,
            latitude: s.latitude,
            longitude: s.longitude,
            service_type: s.service_type,
            scheduled_date: s.scheduled_date,
            scheduled_time: s.scheduled_time,
          })),
          current_location: currentLocation,
        });

        if (result.data?.optimized_sequence) {
          setOptimizedRoute(result.data.optimized_sequence);
        }
      } catch (err) {
        console.error('Erro ao otimizar rota:', err);
        // Se falhar, usa ordem padrão
        setOptimizedRoute(todaysServices.map(s => ({ ...s, sequence: todaysServices.indexOf(s) + 1 })));
      } finally {
        setLoading(false);
      }
    };

    optimizeRoute();
  }, [todaysServices, providerId, currentLocation]);

  if (!todaysServices.length) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 text-center">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum serviço agendado para hoje</p>
        </CardContent>
      </Card>
    );
  }

  // Calcula centro do mapa
  const allCoords = optimizedRoute?.map(s => [s.latitude, s.longitude]) || [];
  if (currentLocation) allCoords.push([currentLocation.latitude, currentLocation.longitude]);
  
  const center = allCoords.length > 0
    ? [
        allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length,
        allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length,
      ]
    : [-23.5505, -46.6333]; // São Paulo padrão

  // Coordenadas da rota
  const routeCoordinates = optimizedRoute
    ? [
        ...(currentLocation ? [[currentLocation.latitude, currentLocation.longitude]] : []),
        ...optimizedRoute.map(s => [s.latitude, s.longitude]),
      ]
    : [];

  const handleApplyRoute = (orderedServices) => {
    if (orderedServices && orderedServices.length > 0) {
      setOptimizedRoute(orderedServices);
    }
  };

  return (
    <div className="space-y-4">
      {/* Otimizador de rota interativo */}
      <RouteOptimizer
        services={todaysServices}
        providerLat={currentLocation?.latitude}
        providerLon={currentLocation?.longitude}
        onApplyRoute={handleApplyRoute}
      />

      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-foreground flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              Rota otimizada para hoje
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {optimizedRoute?.length || 0} serviço{optimizedRoute?.length !== 1 ? 's' : ''} — sequência recomendada
            </p>
          </div>
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        </div>
      </div>

      {error && (
        <div className="bg-orange-50 rounded-2xl p-3 border border-orange-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700">Usando ordem padrão dos serviços</p>
        </div>
      )}

      {/* Mapa */}
      <div className="rounded-2xl overflow-hidden border-2 border-border h-80">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

          {/* Rota em linha */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#FF6B35"
              weight={3}
              opacity={0.6}
              dashArray="5, 5"
            />
          )}

          {/* Localização atual */}
          {currentLocation && (
            <Marker position={[currentLocation.latitude, currentLocation.longitude]} icon={currentLocationIcon}>
              <Popup className="custom-popup">
                <div className="text-sm">
                  <p className="font-semibold">Sua localização</p>
                  <p className="text-xs text-muted-foreground">Ponto de partida</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcadores dos serviços */}
          {optimizedRoute?.map((service, idx) => (
            <Marker
              key={service.id}
              position={[service.latitude, service.longitude]}
              icon={createNumberedIcon(idx + 1, selectedService?.id === service.id ? '#45B7D1' : '#FF6B35')}
              eventHandlers={{
                click: () => setSelectedService(service),
              }}
            >
              <Popup className="custom-popup">
                <div className="text-sm">
                  <p className="font-semibold">Parada #{idx + 1}</p>
                  <p className="text-xs text-muted-foreground">{service.service_type}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Círculos de zona de atendimento */}
          {optimizedRoute?.map((service) => (
            <CircleMarker
              key={`circle-${service.id}`}
              center={[service.latitude, service.longitude]}
              radius={100}
              fillColor="#FF6B35"
              color="#FF6B35"
              weight={1}
              opacity={0.1}
              fillOpacity={0.05}
            />
          ))}
        </MapContainer>
      </div>

      {/* Lista de serviços em ordem */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Sequência de atendimentos</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {optimizedRoute?.map((service, idx) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service)}
              className={cn(
                "w-full text-left rounded-xl p-3 border-2 transition-all",
                selectedService?.id === service.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {service.service_type}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {service.scheduled_time || 'Agendado'}
                  </p>
                </div>
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedService && (
        <div className="bg-card rounded-2xl p-4 border-2 border-primary space-y-2">
          <p className="font-semibold text-foreground">Detalhes do serviço</p>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><strong>Número:</strong> {selectedService.service_number}</p>
            <p><strong>Cliente:</strong> {selectedService.client_name}</p>
            <p><strong>Telefone:</strong> {selectedService.client_phone}</p>
            <p><strong>Endereço:</strong> {selectedService.address}, {selectedService.number} - {selectedService.neighborhood}</p>
            <p><strong>Status:</strong> {selectedService.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}