import React, { useState, useEffect } from 'react';
import { Clock, MapPin, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function NearbyBusyProvidersCard({ alerts, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Procurando prestadores próximos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <h3 className="font-bold text-orange-900">
            {alerts.length} prestador(es) próximo(s) em atendimento
          </h3>
        </div>

        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-xl p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-foreground">{alert.provider_name}</p>
                  <p className="text-xs text-muted-foreground">{alert.service_type.replace(/_/g, ' ')}</p>
                </div>
                {alert.status === 'respondido' && alert.finish_time_minutes && (
                  <Badge className="bg-green-100 text-green-800 border-0 text-xs flex-shrink-0">
                    ✓ {alert.finish_time_minutes}min
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{alert.distance_km} km de distância</span>
                </div>
                {alert.status === 'respondido' && (
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <Clock className="w-3 h-3" />
                    <span>Termina em ~{alert.finish_time_minutes}min</span>
                  </div>
                )}
              </div>

              {alert.status === 'notificado' && (
                <p className="text-xs text-orange-600 font-semibold">
                  ⏳ Aguardando resposta do prestador...
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-orange-700 bg-orange-100 rounded-lg p-2">
          💡 Você pode continuar procurando outros prestadores enquanto aguarda a resposta
        </p>
      </CardContent>
    </Card>
  );
}