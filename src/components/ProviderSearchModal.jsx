import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Star, Calendar, Zap, X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

function calcDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

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
  } catch (e) { /* fallback abaixo */ }
  // Fallback: distância reta + 30% de tortuosidade / velocidade média urbana 50 km/h
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.max(2, Math.round((distKm * 1.3 / 50) * 60));
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

function ProviderCard({ provider, label }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center gap-1">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
          {provider.photo_url ? (
            <img src={provider.photo_url} alt="rosto" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-primary">{provider.name?.charAt(0)}</span>
          )}
        </div>
        {label && <span className="text-[10px] text-primary font-bold">{label}</span>}
      </div>
      {provider.photo_body_url && (
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-2xl bg-muted overflow-hidden border-2 border-border flex-shrink-0">
            <img src={provider.photo_body_url} alt="corpo" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] text-muted-foreground">Corpo</span>
        </div>
      )}
      <div className="flex flex-col justify-center gap-1 flex-1">
        <p className="font-bold text-foreground text-sm">{provider.name}</p>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-sm text-foreground font-medium">{provider.rating?.toFixed(1) || '5.0'}</span>
          <span className="text-xs text-muted-foreground">({provider.total_reviews || 0} aval.)</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary">Disponível agora</span>
        </div>
      </div>
    </div>
  );
}

export default function ProviderSearchModal({ form, onConfirm, onSchedule, onClose }) {
  const [phase, setPhase] = useState('searching'); // searching | found | none | favorites
  const [nearestProvider, setNearestProvider] = useState(null);
  const [secondProvider, setSecondProvider] = useState(null);
  const [estMin, setEstMin] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [confirming, setConfirming] = useState(false);
  const processingRef = useRef(false);
  const [allUnavailabilities, setAllUnavailabilities] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      if (u?.email) {
        base44.entities.Favorite.filter({ client_email: u.email }).then(favs => setFavorites(favs || []));
      }
    }).catch(() => {});
    searchProviders();
  }, []);

  // Geocodifica uma query via Nominatim
  const nominatim = async (query) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    return null;
  };

  // Obtém coords do cliente: endereço completo > bairro+cidade > cidade
  const getClientCoords = async () => {
    if (form.latitude && form.longitude) return { lat: form.latitude, lon: form.longitude };

    // Resolve CEP via ViaCEP para ter logradouro e bairro precisos
    let logradouro = form.address || '';
    let bairro = form.neighborhood || '';
    let cidade = form.city || '';
    let uf = form.state || '';

    if (form.cep) {
      const clean = form.cep.replace(/\D/g, '');
      try {
        const cepRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const cepData = await cepRes.json();
        if (!cepData.erro) {
          logradouro = cepData.logradouro || logradouro;
          bairro = cepData.bairro || bairro;
          cidade = cepData.localidade || cidade;
          uf = cepData.uf || uf;
          console.log('[client] CEP resolvido:', logradouro, bairro, cidade, uf);
        }
      } catch(e) { console.error('[client] erro CEP:', e.message); }
    }

    // Tenta endereço completo (mais preciso)
    if (logradouro && cidade) {
      const q1 = [logradouro, form.number, bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
      const r1 = await nominatim(q1);
      if (r1) { console.log('[client] endereço completo:', r1); return r1; }
    }

    // Fallback: bairro + cidade
    if (bairro && cidade) {
      const r2 = await nominatim(`${bairro}, ${cidade}, ${uf}, Brasil`);
      if (r2) { console.log('[client] bairro+cidade:', r2); return r2; }
    }

    // Fallback: só cidade
    if (cidade) {
      const r3 = await nominatim(`${cidade}, ${uf}, Brasil`);
      if (r3) { console.log('[client] cidade:', r3); return r3; }
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
      const best = sorted[0];
      setNearestProvider(best);
      // Se precisa de 2 prestadores, pega o segundo também
      if (form.requires_two_providers && sorted.length > 1) {
        setSecondProvider(sorted[1]);
      }
      setPhase('found');
      // Calcula ETA via OSRM assincronamente
      const pCoords = getProviderCoords(best);
      if (pCoords && clientLat && clientLon) {
        estMinutesOSRM(pCoords.lat, pCoords.lon, clientLat, clientLon).then(setEstMin);
      }
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

  const handleConfirmImmediate = (providerOverride) => {
    if (confirming || processingRef.current) return;
    processingRef.current = true;
    setConfirming(true);
    const useSecond = providerOverride ? null : secondProvider;
    if (form.modality === 'agendado') {
      const surcharges = getSurcharges(form.scheduled_date, form.scheduled_time);
      onConfirm({ ...form, ...surcharges, _secondProvider: useSecond });
    } else {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDate = now.toISOString().split('T')[0];
      const surcharges = getSurcharges(currentDate, currentTime);
      onConfirm({ ...form, modality: 'imediato', urgency: 'agora', ...surcharges, _secondProvider: useSecond });
    }
  };

  const handleConfirmFavorite = async () => {
    if (!selectedFavorite || confirming || processingRef.current) return;
    processingRef.current = true;
    setConfirming(true);
    // Busca dados completos do prestador favorito
    const providerList = await base44.entities.Provider.filter({ id: selectedFavorite.provider_id });
    const provider = providerList[0] || null;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];
    const surcharges = getSurcharges(currentDate, currentTime);
    onConfirm({ ...form, modality: 'imediato', urgency: 'agora', ...surcharges, _favoriteProvider: provider });
  };

  const handleConfirmSchedule = () => {
    if (confirming || processingRef.current) return;
    processingRef.current = true;
    setConfirming(true);
    const surcharges = getSurcharges(scheduledDate, scheduledTime);
    onSchedule({ ...form, modality: 'agendado', scheduled_date: scheduledDate, scheduled_time: scheduledTime, ...surcharges });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">

        {/* Tabs: Busca automática / Favoritos */}
        {favorites.length > 0 && phase !== 'searching' && (
          <div className="flex border-b border-border">
            <button
              onClick={() => { setPhase('found'); setSelectedFavorite(null); }}
              className={cn("flex-1 py-3 text-sm font-semibold transition-all", phase !== 'favorites' ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
            >
              🔍 Prestador próximo
            </button>
            <button
              onClick={() => setPhase('favorites')}
              className={cn("flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-1", phase === 'favorites' ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
            >
              <Heart className="w-3.5 h-3.5" /> Favoritos
            </button>
          </div>
        )}

        {/* Fase: favoritos */}
        {phase === 'favorites' && (
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-4">Selecione um prestador favorito para este serviço</p>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {favorites.map(fav => (
                <button
                  key={fav.id}
                  onClick={() => setSelectedFavorite(fav)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left",
                    selectedFavorite?.id === fav.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border">
                    {fav.provider_photo_url ? (
                      <img src={fav.provider_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{fav.provider_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{fav.provider_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-muted-foreground">{fav.provider_rating?.toFixed(1) || '—'}</span>
                      {fav.provider_city && <span className="text-xs text-muted-foreground">· {fav.provider_city}</span>}
                    </div>
                  </div>
                  {selectedFavorite?.id === fav.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <Button
              onClick={handleConfirmFavorite}
              disabled={!selectedFavorite || confirming}
              className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground mt-4"
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4 mr-2" /> Chamar este prestador</>}
            </Button>
            <button onClick={onClose} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-2 mt-1">
              Cancelar
            </button>
          </div>
        )}

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
                <span className="font-bold text-base">
                  {form.requires_two_providers ? 'Prestadores disponíveis!' : 'Prestador disponível!'}
                </span>
              </div>
              {/* Prestador 1 */}
              <ProviderCard provider={nearestProvider} label={form.requires_two_providers ? 'Prestador 1' : null} />
              {/* Prestador 2 (apenas quando necessário) */}
              {form.requires_two_providers && secondProvider && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <ProviderCard provider={secondProvider} label="Prestador 2" />
                </div>
              )}
              {form.requires_two_providers && !secondProvider && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <p className="text-xs text-orange-700 font-semibold">⚠️ Apenas 1 prestador disponível agora. Para TV acima de 55" são necessários 2 profissionais — você precisará agendar.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Prestador disponível agora</p>
                  <p className="text-xs text-muted-foreground">O tempo de chegada será calculado e informado automaticamente após a confirmação</p>
                </div>
              </div>
              {/* Se TV acima de 55" com só 1 prestador, força agendamento */}
              {form.requires_two_providers && !secondProvider ? (
                <Button onClick={() => setPhase('none')} className="w-full h-12 rounded-2xl font-bold bg-orange-500 hover:bg-orange-600 text-white mb-3">
                  <Calendar className="w-4 h-4 mr-2" /> Agendar para outro horário
                </Button>
              ) : (
                <>
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
                </>
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