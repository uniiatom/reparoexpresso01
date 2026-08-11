import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, MapPin, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FINISH_TIME_OPTIONS = [5, 10, 15, 30, 40];

async function estMinutesOSRM(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data?.routes?.[0]?.duration) {
      return Math.max(1, Math.round(data.routes[0].duration / 60));
    }
  } catch (e) {}
  
  // Fallback
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.max(2, Math.round((distKm * 1.3 / 50) * 60));
}

export default function BusyAlertResponseModal({ alert, provider, onClose }) {
  const [selectedTime, setSelectedTime] = useState(null);
  const [travelTime, setTravelTime] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTime && provider?.latitude && provider?.longitude) {
      setLoading(true);
      estMinutesOSRM(provider.latitude, provider.longitude, alert.client_latitude, alert.client_longitude)
        .then(mins => {
          setTravelTime(mins);
          setTotalTime((selectedTime || 0) + (mins || 0));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedTime, provider, alert]);

  const handleRespond = async (canAttend) => {
    setLoading(true);
    try {
      const responses = alert.responses || [];
      const newResponse = {
        provider_id: provider.id,
        provider_name: provider.name,
        can_attend: canAttend,
        finish_in_minutes: canAttend ? selectedTime : null,
        travel_minutes: canAttend ? travelTime : null,
        total_eta_minutes: canAttend ? totalTime : null,
        responded_at: new Date().toISOString(),
      };

      await base44.entities.BusyAlert.update(alert.id, {
        responses: [...responses, newResponse],
        status: canAttend ? 'prestador_respondeu' : alert.status,
      });

      toast.success(canAttend ? 'Resposta registrada!' : 'Você recusou o atendimento');
      onClose();
    } catch (err) {
      toast.error('Erro ao responder');
    } finally {
      setLoading(false);
    }
  };

  if (!alert || !provider) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-primary/10 border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">🔔 Novo cliente próximo</h2>
          <p className="text-xs text-muted-foreground mt-1">Cliente tenta abrir serviço imediato</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Cliente info */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{alert.client_name}</p>
                <p className="text-xs text-muted-foreground break-all">{alert.client_phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground line-clamp-2">{alert.client_address}</p>
            </div>
            <div className="text-xs text-foreground mt-2">
              <span className="font-semibold">Serviço:</span> {alert.service_description}
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Você está em execução. Se conseguir terminar em até 30 min, o cliente aguardará. Caso contrário, será aberta agenda para outro prestador.
            </p>
          </div>

          {/* Seletor de tempo */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Em quanto tempo você termina?
            </p>
            <div className="grid grid-cols-5 gap-2">
              {FINISH_TIME_OPTIONS.map(mins => (
                <button
                  key={mins}
                  onClick={() => setSelectedTime(mins)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border-2 ${
                    selectedTime === mins
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* ETA calculada */}
          {selectedTime && totalTime && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
              <p className="text-xs text-muted-foreground">
                Tempo de conclusão: <span className="font-bold text-green-700">{selectedTime}min</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Deslocamento até cliente: <span className="font-bold text-green-700">~{travelTime}min</span>
              </p>
              <p className="text-sm font-bold text-green-700 mt-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                ⏱️ ETA total: ~{totalTime}min
              </p>
              <p className="text-xs text-green-600 mt-1">Cliente será informado deste tempo</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleRespond(true)}
              disabled={!selectedTime || loading}
              className="flex-1 rounded-2xl font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Enviando...' : '✓ Consigo atender'}
            </Button>
            <Button
              onClick={() => handleRespond(false)}
              disabled={loading}
              variant="outline"
              className="flex-1 rounded-2xl font-bold text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {loading ? 'Aguarde...' : '✕ Não consigo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}