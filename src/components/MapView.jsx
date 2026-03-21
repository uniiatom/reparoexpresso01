import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Star, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const clientIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const providerIcon = (rating) => {
  const colorMap = {
    5: 'green',
    4: 'blue',
    3: 'orange',
    2: 'red',
    1: 'red'
  };
  const color = colorMap[Math.floor(rating || 3)];
  const urls = {
    green: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    blue: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    orange: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    red: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  };

  return new Icon({
    iconUrl: urls[color],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

function MapCenter({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

export default function MapView({ 
  clientLocation, 
  providers = [], 
  selectedProvider, 
  onSelectProvider, 
  maxDistance = 20 
}) {
  const [distanceFilter, setDistanceFilter] = useState(maxDistance);

  if (!clientLocation) {
    return (
      <div className="w-full h-96 rounded-2xl bg-muted flex items-center justify-center flex-col gap-3">
        <Navigation className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground text-center">Ative sua localização para ver prestadores próximos</p>
      </div>
    );
  }

  const filteredProviders = providers.filter(p => p.distance <= distanceFilter);

  return (
    <div className="space-y-3">
      {/* Distance filter */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <label className="text-sm font-semibold text-foreground mb-3 block">
          Distância máxima: {distanceFilter.toFixed(1)} km
        </label>
        <input
          type="range"
          min="1"
          max={maxDistance}
          step="0.5"
          value={distanceFilter}
          onChange={(e) => setDistanceFilter(parseFloat(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>1 km</span>
          <span>{maxDistance} km</span>
        </div>
      </div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl overflow-hidden border border-border h-96 bg-muted"
      >
        <MapContainer center={[clientLocation.latitude, clientLocation.longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Client location */}
          <Marker position={[clientLocation.latitude, clientLocation.longitude]} icon={clientIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Sua localização</p>
                <p className="text-muted-foreground text-xs mt-1">Latitude: {clientLocation.latitude.toFixed(4)}</p>
                <p className="text-muted-foreground text-xs">Longitude: {clientLocation.longitude.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>

          {/* Radius circle */}
          <CircleMarker
            center={[clientLocation.latitude, clientLocation.longitude]}
            radius={distanceFilter * 10}
            fill={false}
            color="primary"
            weight={2}
            opacity={0.3}
            dashArray="5, 5"
          />

          {/* Providers */}
          {filteredProviders.map((provider) => (
            <Marker
              key={provider.id}
              position={[provider.latitude || 0, provider.longitude || 0]}
              icon={providerIcon(provider.rating)}
              onClick={() => onSelectProvider(provider)}
            >
              <Popup>
                <div className="text-sm w-48">
                  <p className="font-bold text-foreground">{provider.name}</p>
                  <div className="flex items-center gap-2 my-1">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-3 h-3", i < Math.floor(provider.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{provider.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{provider.city}, {provider.state}</p>
                  <p className="font-semibold text-primary text-xs mb-2">📍 {provider.distance?.toFixed(1)} km de distância</p>
                  {provider.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <Phone className="w-3 h-3" /> {provider.phone}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          <MapCenter center={[clientLocation.latitude, clientLocation.longitude]} />
        </MapContainer>
      </motion.div>

      {/* Providers list */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3">
          {filteredProviders.length} prestador{filteredProviders.length !== 1 ? 'es' : ''} próximo{filteredProviders.length !== 1 ? 's' : ''}
        </p>

        {filteredProviders.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredProviders.map((provider) => (
              <motion.button
                key={provider.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => onSelectProvider(provider)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border-2 transition-all',
                  selectedProvider?.id === provider.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">{provider.city}, {provider.state}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {provider.distance?.toFixed(1)} km
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-3 h-3", i < Math.floor(provider.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{provider.rating?.toFixed(1) || 'N/A'} ({provider.total_reviews || 0})</span>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum prestador encontrado nesta distância
          </p>
        )}
      </div>
    </div>
  );
}