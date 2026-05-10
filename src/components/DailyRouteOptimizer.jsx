import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { MapPin, Navigation, Clock, Zap, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const createNumberedIcon = (number, isSelected = false) => {
  const color = isSelected ? '#45B7D1' : '#FF6B35';
  return L.divIcon({
    html: `<div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      transition: transform 0.2s;
      transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}
    ">${number}</div>`,
    iconSize: [40, 40],
    className: 'numbered-icon',
  });
};

const startIcon = L.divIcon({
  html: `<div style="
    background: #22c55e;
    color: white;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  ">📍</div>`,
  iconSize: [44, 44],
  className: 'start-icon',
});

export default function DailyRouteOptimizer({ providerId, providerLocation }) {
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedService, setExpandedService] = useState(null);
  const [error, setError] = useState(null);

  // Busca serviços de hoje
  useEffect(() => {
    const fetchTodaysServices = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
        const services = await base44.entities.ServiceRequest.filter({
          provider_id: providerId,
          status: { $in: ['agendado', 'aceito', 'a_caminho', 'em_andamento'] }
        });

        const todaysServices = services.filter(s => 
          s.scheduled_date && s.scheduled_date >= today && s.scheduled_date < tomorrow
        );

        if (todaysServices.length === 0) {
          setOptimizedRoute([]);
          setRouteSummary(null);
          return;
        }

        // Otimiza rota
        optimizeRoute(todaysServices);
      } catch (err) {
        console.error('Erro ao buscar serviços:', err);
        setError('Erro ao carregar serviços');
      }
    };

    fetchTodaysServices();
  }, [providerId]);

  const optimizeRoute = async (services) => {
    setLoading(true);
    setError(null);
    try {
      const result = await base44.functions.invoke('optimizeRouteV2', {
        services: services.map(s => ({
          id: s.id,
          latitude: s.client_latitude || s.latitude || 0,
          longitude: s.client_longitude || s.longitude || 0,
          service_type: s.service_type,
          scheduled_date: s.scheduled_date,
          scheduled_time: s.scheduled_time,
          client_name: s.client_name,
          client_phone: s.client_phone,
          address: s.address,
          number: s.number,
          neighborhood: s.neighborhood,
          service_number: s.service_number,
          status: s.status,
        })),
        providerLat: providerLocation?.latitude || -23.5505,
        providerLon: providerLocation?.longitude || -46.6333,
      });

      if (result.data?.optimized) {
        setOptimizedRoute(result.data.optimized);
        setRouteSummary(result.data.summary);
      }
    } catch (err) {
      console.error('Erro ao otimizar rota:', err);
      setError('Erro ao otimizar rota');
    } finally {
      setLoading(false);
    }
  };

  if (!optimizedRoute) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Otimizando rota...</p>
              </>
            ) : (
              <>
                <MapPin className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum serviço agendado para hoje</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (optimizedRoute.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sem serviços agendados para hoje</p>
        </CardContent>
      </Card>
    );
  }

  // Calcula centro do mapa
  const allCoords = [
    ...(providerLocation ? [[providerLocation.latitude, providerLocation.longitude]] : []),
    ...optimizedRoute.map(s => [s.latitude, s.longitude])
  ];

  const center = allCoords.length > 0
    ? [
        allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length,
        allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length,
      ]
    : [-23.5505, -46.6333];

  const routeCoordinates = [
    ...(providerLocation ? [[providerLocation.latitude, providerLocation.longitude]] : []),
    ...optimizedRoute.map(s => [s.latitude, s.longitude])
  ];

  return (
    <div className="space-y-4">
      {/* Resumo da Rota */}
      {routeSummary && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-4 border-2 border-primary/20">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                <p className="font-bold text-foreground text-lg">Rota Otimizada para Hoje</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="bg-white/50 rounded-xl p-2">
                  <p className="text-xs text-muted-foreground">Serviços</p>
                  <p className="text-lg font-bold text-foreground">{routeSummary.totalServices}</p>
                </div>
                <div className="bg-white/50 rounded-xl p-2">
                  <p className="text-xs text-muted-foreground">Distância Total</p>
                  <p className="text-lg font-bold text-foreground">{routeSummary.totalDistance} km</p>
                </div>
                <div className="bg-white/50 rounded-xl p-2">
                  <p className="text-xs text-muted-foreground">Tempo Total</p>
                  <p className="text-lg font-bold text-foreground">{routeSummary.estimatedTimeText}</p>
                </div>
                <div className="bg-white/50 rounded-xl p-2">
                  <p className="text-xs text-muted-foreground">Economia</p>
                  <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                    <Zap className="w-4 h-4" /> Otimizada
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-orange-50 rounded-2xl p-3 border border-orange-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700">{error}</p>
        </div>
      )}

      {/* Mapa */}
      <div className="rounded-2xl overflow-hidden border-2 border-border h-96">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

          {/* Rota em linha */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#FF6B35"
              weight={4}
              opacity={0.7}
              dashArray="10, 5"
            />
          )}

          {/* Ponto de partida */}
          {providerLocation && (
            <Marker position={[providerLocation.latitude, providerLocation.longitude]} icon={startIcon}>
              <Tooltip>Sua localização atual</Tooltip>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Localização Atual</p>
                  <p className="text-xs text-muted-foreground">Ponto de partida</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcadores dos serviços */}
          {optimizedRoute.map((service, idx) => (
            <Marker
              key={service.id}
              position={[service.latitude, service.longitude]}
              icon={createNumberedIcon(idx + 1, selectedService?.id === service.id)}
              eventHandlers={{
                click: () => setSelectedService(service),
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <p className="font-semibold">Parada #{idx + 1}</p>
                  <p>{service.service_type}</p>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Parada #{idx + 1}</p>
                  <p className="text-xs text-muted-foreground">{service.service_type}</p>
                  {service.estimatedDistanceFromPrevious && (
                    <p className="text-xs mt-1 text-primary font-semibold">
                      {service.estimatedDistanceFromPrevious} km
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Zonas de atendimento */}
          {optimizedRoute.map((service) => (
            <CircleMarker
              key={`circle-${service.id}`}
              center={[service.latitude, service.longitude]}
              radius={80}
              fillColor="#FF6B35"
              color="#FF6B35"
              weight={1}
              opacity={0.1}
              fillOpacity={0.05}
            />
          ))}
        </MapContainer>
      </div>

      {/* Lista Detalhada de Serviços */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Sequência de Atendimentos</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {optimizedRoute.map((service, idx) => (
            <div key={service.id}>
              <button
                onClick={() => {
                  setSelectedService(service);
                  setExpandedService(expandedService === service.id ? null : service.id);
                }}
                className={cn(
                  "w-full text-left rounded-xl p-3 border-2 transition-all",
                  selectedService?.id === service.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{service.service_type}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {service.scheduled_time || 'Agendado'}
                    </p>
                  </div>
                  <div className="text-right text-xs flex-shrink-0">
                    {service.estimatedDurationFromPrevious && (
                      <p className="text-primary font-semibold">{service.estimatedDurationFromPrevious}min</p>
                    )}
                    {service.estimatedDistanceFromPrevious && (
                      <p className="text-muted-foreground">{service.estimatedDistanceFromPrevious}km</p>
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                    expandedService === service.id && "rotate-180"
                  )} />
                </div>
              </button>

              {/* Detalhes expandidos */}
              {expandedService === service.id && (
                <div className="bg-muted/30 rounded-b-xl p-3 border-2 border-t-0 border-primary/20 space-y-2">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-semibold text-foreground">{service.client_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <a href={`tel:${service.client_phone}`} className="font-semibold text-primary hover:underline">
                        {service.client_phone}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Endereço:</span>
                      <span className="font-semibold text-foreground">{service.address}, {service.number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bairro:</span>
                      <span className="font-semibold text-foreground">{service.neighborhood}</span>
                    </div>
                    {service.cumulativeDistance && (
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">Dist. Acumulada:</span>
                        <span className="font-semibold text-primary">{service.cumulativeDistance} km</span>
                      </div>
                    )}
                    {service.cumulativeDuration && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo Acumulado:</span>
                        <span className="font-semibold text-primary">
                          {Math.floor(service.cumulativeDuration / 60)}h {service.cumulativeDuration % 60}m
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-lg"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${service.latitude},${service.longitude}`, '_blank')}
                  >
                    📍 Abrir no Google Maps
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}