import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Star, Calendar, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";

function calcDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function estMinutes(distKm) {
  if (distKm === null) return null;
  return Math.round((distKm / 30) * 60); // ~30km/h média urbana
}

const TIME_SLOTS = ["07:00","08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00","18:00"];

export default function ProviderSearchModal({ form, onConfirm, onSchedule, onClose }) {
  const [phase, setPhase] = useState('searching'); // searching | found | none
  const [nearestProvider, setNearestProvider] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    searchProviders();
  }, []);

  const searchProviders = async () => {
    setPhase('searching');
    await new Promise(r => setTimeout(r, 2000)); // Feedback visual de busca

    const providers = await base44.entities.Provider.filter({ is_online: true, is_approved: true });

    if (!providers.length) {
      setPhase('none');
      return;
    }

    // Calcular distância de cada prestador ao cliente
    const clientLat = form.latitude;
    const clientLon = form.longitude;

    const withDistance = providers.map(p => {
      const dist = calcDistance(clientLat, clientLon, p.latitude, p.longitude);
      return { ...p, distance: dist };
    });

    // Ordenar por distância (null vai pro final)
    withDistance.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    const best = withDistance[0];
    setNearestProvider(best);
    setPhase('found');
  };

  const handleConfirmImmediate = () => {
    onConfirm({ ...form, modality: 'imediato', urgency: 'agora' });
  };

  const handleConfirmSchedule = () => {
    onSchedule({ ...form, modality: 'agendado', scheduled_date: scheduledDate, scheduled_time: scheduledTime });
  };

  const estMin = nearestProvider ? estMinutes(nearestProvider.distance) : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Fase: buscando */}
        {phase === 'searching' && (
          <div className="p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-9 h-9 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground">Buscando prestadores</h3>
            <p className="text-muted-foreground mt-2 text-sm">Localizando profissionais disponíveis perto de você...</p>
            <div className="flex justify-center gap-1 mt-5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Fase: prestador encontrado */}
        {phase === 'found' && nearestProvider && (
          <div>
            <div className="bg-green-50 px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-green-700 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-base">Prestador disponível!</span>
              </div>
              {/* Fotos do prestador */}
              <div className="flex gap-3 mb-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
                    {nearestProvider.photo_url ? (
                      <img src={nearestProvider.photo_url} alt="rosto" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-primary">{nearestProvider.name?.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">Rosto</span>
                </div>
                {nearestProvider.photo_body_url && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-20 h-20 rounded-2xl bg-muted overflow-hidden border-2 border-border flex-shrink-0">
                      <img src={nearestProvider.photo_body_url} alt="corpo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs text-muted-foreground">Corpo inteiro</span>
                  </div>
                )}
                <div className="flex flex-col justify-center gap-1 flex-1">
                  <p className="font-bold text-foreground">{nearestProvider.name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm text-foreground font-medium">{nearestProvider.rating?.toFixed(1) || '5.0'}</span>
                    <span className="text-xs text-muted-foreground">({nearestProvider.total_reviews || 0} aval.)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {nearestProvider.distance !== null
                        ? `${nearestProvider.distance.toFixed(1)} km`
                        : 'Distância não disponível'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {estMin !== null && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">~{estMin} min de chegada</p>
                    <p className="text-xs text-muted-foreground">Baseado na distância atual</p>
                  </div>
                </div>
              )}
              <Button onClick={handleConfirmImmediate} className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground mb-3">
                <Zap className="w-4 h-4 mr-2" /> Confirmar atendimento agora
              </Button>
              <button
                onClick={() => setPhase('none')}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1"
              >
                Prefiro agendar para outro horário
              </button>
            </div>
          </div>
        )}

        {/* Fase: nenhum disponível / agendar */}
        {phase === 'none' && (
          <div>
            <div className="bg-orange-50 px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold text-base">Nenhum prestador disponível agora</span>
              </div>
              <p className="text-sm text-orange-700/80">
                Todos os profissionais estão ocupados no momento. Agende para um horário conveniente!
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Data
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full border border-border rounded-2xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Horário</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map(t => (
                    <button key={t} onClick={() => setScheduledTime(t)}
                      className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all",
                        scheduledTime === t ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleConfirmSchedule}
                disabled={!scheduledDate || !scheduledTime}
                className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
              >
                <Calendar className="w-4 h-4 mr-2" /> Confirmar agendamento
              </Button>
              <button onClick={onClose} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Botão fechar quando buscando (caso queira cancelar) */}
        {phase === 'searching' && (
          <div className="px-6 pb-6">
            <button onClick={onClose} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}