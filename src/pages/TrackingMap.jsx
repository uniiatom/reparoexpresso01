import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Navigation, Phone, MapPin, Clock, ExternalLink } from "lucide-react";

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

function GoogleMapView({ apiKey, providerLat, providerLng, clientLat, clientLng }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const providerMarkerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Google Maps JS SDK
  useEffect(() => {
    if (window.google?.maps) { setScriptLoaded(true); return; }
    const existing = document.getElementById('gmap-sdk');
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmap-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Init map once script + client coords available
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !clientLat || !clientLng) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: clientLat, lng: clientLng },
      zoom: 14,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb5' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3245' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334055' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1520' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapInstanceRef.current = map;

    // Client marker (blue pulsing dot)
    new window.google.maps.Marker({
      position: { lat: clientLat, lng: clientLng },
      map,
      title: 'Sua localização',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      zIndex: 10,
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#f59e0b',
        strokeWeight: 5,
        strokeOpacity: 0.85,
      },
    });
    directionsRendererRef.current.setMap(map);
  }, [scriptLoaded, clientLat, clientLng]);

  // Update provider marker + route when provider coords change
  useEffect(() => {
    if (!mapInstanceRef.current || !providerLat || !providerLng || !scriptLoaded) return;

    const provPos = { lat: providerLat, lng: providerLng };

    if (providerMarkerRef.current) {
      providerMarkerRef.current.setPosition(provPos);
    } else {
      providerMarkerRef.current = new window.google.maps.Marker({
        position: provPos,
        map: mapInstanceRef.current,
        title: 'Prestador',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: 0,
        },
        zIndex: 20,
      });
    }

    // Draw/update route
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route({
      origin: provPos,
      destination: { lat: clientLat, lng: clientLng },
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === 'OK' && directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result);
      }
    });

    // Fit both points in view
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: clientLat, lng: clientLng });
    bounds.extend(provPos);
    mapInstanceRef.current.fitBounds(bounds, { top: 60, right: 40, bottom: 160, left: 40 });
  }, [providerLat, providerLng, scriptLoaded]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: 400 }} />;
}

export default function TrackingMap() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [mapsApiKey, setMapsApiKey] = useState(null);
  const [keyError, setKeyError] = useState(false);

  // Fetch API key from backend
  useEffect(() => {
    base44.functions.invoke('getGoogleMapsKey', {})
      .then(res => setMapsApiKey(res.data?.key))
      .catch(() => setKeyError(true));
  }, []);

  // Load & subscribe to service request
  useEffect(() => {
    if (!requestId) return;
    base44.entities.ServiceRequest.filter({ id: requestId }).then(list => {
      if (list[0]) setRequest(list[0]);
    });
    const unsubscribe = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.id === requestId && event.data) setRequest(event.data);
    });
    return unsubscribe;
  }, [requestId]);

  const hasProvider = request?.provider_latitude && request?.provider_longitude;
  const clientLat = request?.client_latitude || request?.latitude;
  const clientLng = request?.client_longitude || request?.longitude;
  const hasClient = !!clientLat && !!clientLng;

  const distance = (hasClient && hasProvider)
    ? calculateDistance(clientLat, clientLng, request.provider_latitude, request.provider_longitude)
    : null;
  const eta = distance != null ? estimateETA(distance) : null;

  const openGoogleMaps = () => {
    if (hasProvider && hasClient) {
      window.open(
        `https://www.google.com/maps/dir/${request.provider_latitude},${request.provider_longitude}/${clientLat},${clientLng}`,
        '_blank'
      );
    }
  };

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
        {keyError && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-3">
            <MapPin className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Configure a chave <strong>GOOGLE_MAPS_API_KEY</strong> nas secrets do app para ativar o mapa.
            </p>
          </div>
        )}
        {!keyError && mapsApiKey && hasClient && (
          <GoogleMapView
            apiKey={mapsApiKey}
            clientLat={clientLat}
            clientLng={clientLng}
            providerLat={hasProvider ? request.provider_latitude : null}
            providerLng={hasProvider ? request.provider_longitude : null}
          />
        )}
        {!keyError && mapsApiKey && !hasClient && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Localização do cliente não disponível</p>
          </div>
        )}
        {!keyError && !mapsApiKey && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-card border-t border-border space-y-2">
        {!hasProvider && (
          <p className="text-sm text-muted-foreground text-center">
            A localização do prestador aparecerá assim que ele iniciar o deslocamento
          </p>
        )}
        {hasProvider && hasClient && (
          <Button
            onClick={openGoogleMaps}
            variant="outline"
            className="w-full rounded-xl h-11 gap-2 border-primary/30 text-primary font-semibold"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir rota no Google Maps
          </Button>
        )}
      </div>
    </div>
  );
}