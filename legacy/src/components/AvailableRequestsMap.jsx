import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, MapPin, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const UserLocationMarker = ({ position }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView([position[0], position[1]], map.getZoom());
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <>
      <Marker 
        position={position}
        icon={L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        })}
      >
        <Popup>📍 Sua localização</Popup>
      </Marker>
      <Circle center={position} radius={5000} color="blue" fill={false} weight={2} />
    </>
  );
};

const RequestMarker = ({ request, onAccept, isAccepting }) => {
  const [showDetails, setShowDetails] = useState(false);
  const distance = request.distance_km ? `${request.distance_km.toFixed(1)} km` : 'Calculando...';

  return (
    <Marker 
      position={[request.latitude, request.longitude]}
      icon={L.icon({
        iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f97316'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z'/%3E%3C/svg%3E`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })}
    >
      <Popup>
        <div className="min-w-64 space-y-2">
          <div>
            <p className="font-bold text-sm">{request.service_type}</p>
            <p className="text-xs text-muted-foreground">{request.description.substring(0, 80)}...</p>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{distance}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{request.client_phone}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(request.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="bg-primary/10 rounded p-2">
            <p className="text-xs font-semibold text-primary">
              R$ {request.client_suggested_price || 'A negociar'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onAccept(request.id)}
            disabled={isAccepting}
            className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs h-8"
          >
            {isAccepting ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              '✓'
            )}
            {isAccepting ? 'Aceitando...' : 'Aceitar Serviço'}
          </Button>
        </div>
      </Popup>
    </Marker>
  );
};

export default function AvailableRequestsMap({ providerId, providerLocation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState(providerLocation);
  const [acceptingId, setAcceptingId] = useState(null);
  const mapRef = useRef(null);

  // Busca solicitações disponíveis próximas ao prestador
  useEffect(() => {
    if (!userPosition) {
      // Tenta obter localização do navegador
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          toast.error('Não foi possível obter sua localização');
          setLoading(false);
        }
      );
      return;
    }

    fetchNearbyRequests();
    
    // Polling a cada 10 segundos
    const interval = setInterval(fetchNearbyRequests, 10000);
    
    // Subscribe para atualizações em tempo real
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.type === 'create' && event.data?.status === 'aguardando') {
        fetchNearbyRequests();
      } else if (event.type === 'update' && event.data?.status !== 'aguardando') {
        // Remove da lista se foi aceito/cancelado
        setRequests(prev => prev.filter(r => r.id !== event.id));
      }
    });

    return () => {
      clearInterval(interval);
      unsub?.();
    };
  }, [userPosition]);

  const fetchNearbyRequests = async () => {
    try {
      setLoading(true);
      const allRequests = await base44.entities.ServiceRequest.filter(
        { status: 'aguardando' },
        '-created_date',
        100
      );

      // Calcula distância e filtra por proximidade (até 30km)
      const nearbyRequests = allRequests
        .map(req => ({
          ...req,
          distance_km: userPosition ? calculateDistance(
            userPosition[0],
            userPosition[1],
            req.latitude,
            req.longitude
          ) : null,
        }))
        .filter(req => !req.provider_id && (req.distance_km === null || req.distance_km <= 30))
        .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

      setRequests(nearbyRequests);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleAcceptRequest = async (requestId) => {
    setAcceptingId(requestId);
    try {
      await base44.functions.invoke('assignServiceToProvider', {
        request_id: requestId,
        provider_id: providerId,
      });

      toast.success('Serviço aceito com sucesso!');
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setAcceptingId(null);
    } catch (error) {
      console.error('Erro ao aceitar serviço:', error);
      toast.error('Erro ao aceitar serviço. Tente novamente.');
      setAcceptingId(null);
    }
  };

  if (!userPosition) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-card rounded-3xl border border-border">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Obtendo sua localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        <div className="p-4 bg-primary/5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Solicitações Disponíveis ({requests.length})</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-9 text-xs"
            onClick={fetchNearbyRequests}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : '🔄'}
            Atualizar
          </Button>
        </div>

        {requests.length === 0 && !loading && (
          <div className="h-96 flex items-center justify-center bg-muted/20">
            <div className="text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm text-muted-foreground">Nenhuma solicitação disponível em sua região</p>
            </div>
          </div>
        )}

        {(requests.length > 0 || loading) && (
          <MapContainer 
            center={userPosition} 
            zoom={12} 
            style={{ height: '400px', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <UserLocationMarker position={userPosition} />
            {requests.map(request => (
              <RequestMarker
                key={request.id}
                request={request}
                onAccept={handleAcceptRequest}
                isAccepting={acceptingId === request.id}
              />
            ))}
          </MapContainer>
        )}
      </div>

      {requests.length > 0 && (
        <div className="bg-card rounded-3xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Próximas solicitações:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {requests.slice(0, 5).map(request => (
              <div
                key={request.id}
                className="bg-muted/30 rounded-2xl p-3 border border-border hover:bg-muted/50 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{request.service_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{request.address}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {request.distance_km ? `${request.distance_km.toFixed(1)} km` : 'Calculando...'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-primary">
                      R$ {request.client_suggested_price || 'A negociar'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {request.client_phone}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAcceptRequest(request.id)}
                  disabled={acceptingId === request.id}
                  className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                >
                  {acceptingId === request.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    '✓'
                  )}
                  {acceptingId === request.id ? 'Aceitando...' : 'Aceitar'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}