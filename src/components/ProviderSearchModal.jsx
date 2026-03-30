import React, { useEffect, useState, useRef } from 'react';
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
  if (distKm < 0.1) return 1;
  return Math.round((distKm / 50) * 60); // ~50km/h média urbana
}

const TIME_SLOTS = ["07:00","08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00","18:00"];

const FIXED_HOLIDAYS = [
  "01-01", // Ano Novo
  "04-21", // Tiradentes
  "05-01", // Dia do Trabalho
  "09-07", // Independência
  "10-12", // Nossa Senhora Aparecida
  "11-02", // Finados
  "11-15", // Proclamação da República
  "12-25", // Natal
];

const isHolidayOrSunday = (date) => {
  if (!date) return false;
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();
  const monthDay = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  
  return dayOfWeek === 0 || FIXED_HOLIDAYS.includes(monthDay);
};

export default function ProviderSearchModal({ form, onConfirm, onSchedule, onClose }) {
  const [phase, setPhase] = useState('searching'); // searching | found | none
  const [nearestProvider, setNearestProvider] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [confirming, setConfirming] = useState(false);
  const processingRef = useRef(false);
  const [allUnavailabilities, setAllUnavailabilities] = useState([]);

  useEffect(() => {
    // Se já é agendado com data/hora definidos, confirma direto sem buscar prestador
    if (form.modality === 'agendado' && form.scheduled_date && form.scheduled_time) {
      // Calcular sobretaxas inline (getSurcharges ainda não está disponível aqui via closure, então inline)
      const date = form.scheduled_date;
      const time = form.scheduled_time;
      const [hours] = time.split(':');
      const night_surcharge = parseInt(hours) >= 18;
      const dateObj = new Date(date + 'T00:00:00');
      const weekend_surcharge = dateObj.getDay() === 6;
      const monthDay = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const HOLIDAYS = ["01-01","04-21","05-01","09-07","10-12","11-02","11-15","12-25"];
      const holiday_surcharge = dateObj.getDay() === 0 || HOLIDAYS.includes(monthDay);
      onConfirm({ ...form, night_surcharge, weekend_surcharge, holiday_surcharge });
      return;
    }
    searchProviders();
  }, []);

  // Obtém coords do cliente via CEP (ViaCEP) + cidade no Nominatim
  const getClientCoords = async () => {
    // 1. Coords diretas já capturadas no formulário
    if (form.latitude && form.longitude) {
      console.log('[client] coords diretas:', form.latitude, form.longitude);
      return { lat: form.latitude, lon: form.longitude };
    }
    // 2. Resolve CEP via ViaCEP para obter cidade/UF
    if (form.cep) {
      const clean = form.cep.replace(/\D/g, '');
      try {
        const cepRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const cepData = await cepRes.json();
        if (!cepData.erro) {
          const cidade = cepData.localidade;
          const uf = cepData.uf;
          console.log('[client] CEP resolvido:', cidade, uf);
          // Busca coords da cidade via Nominatim
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(uf)}&country=Brazil&limit=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          const nomData = await nomRes.json();
          if (nomData?.length > 0) {
            console.log('[client] coords cidade:', parseFloat(nomData[0].lat), parseFloat(nomData[0].lon));
            return { lat: parseFloat(nomData[0].lat), lon: parseFloat(nomData[0].lon) };
          }
        }
      } catch(e) {
        console.error('[client] erro CEP:', e.message);
      }
    }
    // 3. Fallback: cidade do formulário diretamente
    if (form.city) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent(form.city)}&country=Brazil&limit=1`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const nomData = await nomRes.json();
        if (nomData?.length > 0) {
          return { lat: parseFloat(nomData[0].lat), lon: parseFloat(nomData[0].lon) };
        }
      } catch(e) {}
    }
    return null;
  };

  // Coords do prestador: GPS salvo quando ele ficou online
  const getProviderCoords = (p) => {
    if (p.latitude && p.longitude) {
      console.log('[provider] GPS:', p.name, p.latitude, p.longitude);
      return { lat: p.latitude, lon: p.longitude };
    }
    return null;
  };

  const searchProviders = async () => {
    setPhase('searching');

    const [clientCoords, onlineProviders] = await Promise.all([
      getClientCoords(),
      base44.entities.Provider.filter({ is_online: true, is_approved: true }),
    ]);

    const clientLat = clientCoords?.lat || null;
    const clientLon = clientCoords?.lon || null;
    console.log('[search] clientCoords:', clientLat, clientLon);

    const enrichWithDistance = (providers) => {
      return providers.map(p => {
        const coords = getProviderCoords(p);
        const dist = calcDistance(clientLat, clientLon, coords?.lat, coords?.lon);
        console.log('[search] prestador:', p.name, '| coords:', coords, '| dist:', dist);
        return { ...p, distance: dist };
      }).sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    };

    if (onlineProviders.length > 0) {
      const sorted = enrichWithDistance(onlineProviders);
      setNearestProvider(sorted[0]);
      setPhase('found');
      return;
    }

    // Nenhum online — busca todos aprovados
    const [allProviders, unavails] = await Promise.all([
      base44.entities.Provider.filter({ is_approved: true }),
      base44.entities.ProviderUnavailability.list(),
    ]);
    setAllUnavailabilities(unavails || []);

    if (allProviders.length > 0) {
      const sorted = enrichWithDistance(allProviders);
      setNearestProvider(sorted[0]);
    }

    setPhase('none');
  };

  // Verifica se uma data+hora está bloqueada para TODOS os prestadores (todos com indisponibilidade)
  const isSlotBlockedForAll = (date, time) => {
    if (!allUnavailabilities.length) return false;
    return allUnavailabilities.some(u => {
      if (!date || date < u.start_date || date > u.end_date) return false;
      if (!u.start_time && !u.end_time) return true;
      if (time && u.start_time && u.end_time) return time >= u.start_time && time < u.end_time;
      return true;
    });
  };

  const isDateBlockedForAll = (date) => {
    if (!date) return false;
    return allUnavailabilities.some(u =>
      date >= u.start_date && date <= u.end_date && !u.start_time && !u.end_time
    );
  };

  const getSurcharges = (date, time) => {
    let night_surcharge = false;
    let weekend_surcharge = false;
    let holiday_surcharge = false;

    // Verificar hora (após 18:00)
    if (time) {
      const [hours] = time.split(':');
      night_surcharge = parseInt(hours) >= 18;
    }

    // Verificar dia da semana (sábado = 6) e feriados/domingos
    if (date) {
      const dateObj = new Date(date + 'T00:00:00');
      weekend_surcharge = dateObj.getDay() === 6;
      holiday_surcharge = isHolidayOrSunday(date);
    }

    return { night_surcharge, weekend_surcharge, holiday_surcharge };
  };

  const handleConfirmImmediate = () => {
    if (confirming || processingRef.current) return;
    processingRef.current = true;
    setConfirming(true);
    if (form.modality === 'agendado') {
      const surcharges = getSurcharges(form.scheduled_date, form.scheduled_time);
      onConfirm({ ...form, ...surcharges });
    } else {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDate = now.toISOString().split('T')[0];
      const surcharges = getSurcharges(currentDate, currentTime);
      // Não define estimated_arrival_minutes aqui — será calculado pelo prestador ao aceitar
      onConfirm({ ...form, modality: 'imediato', urgency: 'agora', ...surcharges });
    }
  };

  const handleConfirmSchedule = () => {
    if (confirming || processingRef.current) return;
    processingRef.current = true;
    setConfirming(true);
    const surcharges = getSurcharges(scheduledDate, scheduledTime);
    onSchedule({ ...form, modality: 'agendado', scheduled_date: scheduledDate, scheduled_time: scheduledTime, ...surcharges });
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
                        : 'Localização não informada'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {estMin != null ? `~${estMin} min de chegada` : 'Disponível agora'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {estMin != null ? `~${estMin} min de chegada` : 'Prestador disponível agora'}
                  </p>
                  {estMin != null && (
                    <p className="text-xs text-muted-foreground">Baseado na distância atual</p>
                  )}
                </div>
              </div>
              <Button onClick={handleConfirmImmediate} disabled={confirming} className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground mb-3">
                {confirming
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : form.modality === 'agendado'
                    ? <><Calendar className="w-4 h-4 mr-2" /> Confirmar agendamento</>
                    : <><Zap className="w-4 h-4 mr-2" /> Confirmar atendimento agora</>
                }
              </Button>
              {form.modality !== 'agendado' && (
                <button
                  onClick={() => setPhase('none')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1"
                >
                  Prefiro agendar para outro horário
                </button>
              )}
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
                  onChange={e => {
                    const d = e.target.value;
                    if (isDateBlockedForAll(d)) return; // data completamente bloqueada
                    setScheduledDate(d);
                    setScheduledTime('');
                  }}
                  className="w-full border border-border rounded-2xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {scheduledDate && isDateBlockedForAll(scheduledDate) && (
                  <p className="text-xs text-red-600 mt-1">Nenhum prestador disponível nesta data.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Horário</label>
                <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map(t => {
                      const blocked = isSlotBlockedForAll(scheduledDate, t);
                      const surcharges = getSurcharges(scheduledDate, t);
                      const totalSurcharge = (surcharges.holiday_surcharge ? 70 : surcharges.weekend_surcharge ? 40 : 0) + (surcharges.night_surcharge ? 30 : 0);
                      if (blocked) return null;
                      return (
                        <button key={t} onClick={() => setScheduledTime(t)}
                          className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all",
                            scheduledTime === t ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground")}>
                          {t} {totalSurcharge > 0 && <span className="text-red-500 ml-1">+{totalSurcharge}%</span>}
                        </button>
                      );
                    })}
                  </div>
              </div>
              <Button
                onClick={handleConfirmSchedule}
                disabled={!scheduledDate || !scheduledTime || confirming}
                className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
              >
                {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Calendar className="w-4 h-4 mr-2" /> Confirmar agendamento</>}
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