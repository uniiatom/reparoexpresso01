import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Star, Calendar, Zap, X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import ProviderLevelBadge from "@/components/ProviderLevelBadge";
import BusyAlertClientView from "@/components/BusyAlertClientView";

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

function PhotoZoom({ src, alt, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt} className="w-full rounded-2xl object-contain max-h-[80vh]" />
        <button onClick={onClose} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>,
    document.body
  );
}

function ProviderCard({ provider, label }) {
  const [zoomedPhoto, setZoomedPhoto] = useState(null);
  const rating = provider.rating || 5.0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <>
      {zoomedPhoto && <PhotoZoom src={zoomedPhoto.src} alt={zoomedPhoto.alt} onClose={() => setZoomedPhoto(null)} />}
      <div className="flex gap-3 items-start">
        {/* Foto principal */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => provider.photo_url && setZoomedPhoto({ src: provider.photo_url, alt: 'rosto' })}
            className={cn(
              "w-16 h-16 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center border-2 border-primary/30",
              provider.photo_url && "cursor-zoom-in hover:opacity-80 transition-opacity"
            )}
          >
            {provider.photo_url ? (
              <img src={provider.photo_url} alt="rosto" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-primary">{provider.name?.charAt(0)}</span>
            )}
          </button>
          {label && <span className="text-[10px] text-primary font-bold">{label}</span>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm leading-tight">{provider.name}</p>

          {/* Estrelas */}
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-3.5 h-3.5",
                  i < fullStars
                    ? "text-yellow-400 fill-yellow-400"
                    : i === fullStars && hasHalf
                    ? "text-yellow-400 fill-yellow-200"
                    : "text-gray-300 fill-gray-100"
                )}
              />
            ))}
            <span className="text-xs font-semibold text-foreground ml-0.5">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({provider.total_reviews || 0})</span>
          </div>

          {/* Nível */}
          <div className="mt-1.5">
            <ProviderLevelBadge providerId={provider.id} size="sm" />
          </div>

          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-primary">Disponível agora</span>
          </div>
        </div>

        {/* Foto corpo (menor, no canto) */}
        {provider.photo_body_url && (
          <button
            onClick={() => setZoomedPhoto({ src: provider.photo_body_url, alt: 'corpo' })}
            className="w-10 h-10 rounded-xl bg-muted overflow-hidden border border-border flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
          >
            <img src={provider.photo_body_url} alt="corpo" className="w-full h-full object-cover" />
          </button>
        )}
      </div>
    </>
  );
}

export default function ProviderSearchModal({ form, onConfirm, onSchedule, onClose, onBusyAlertCreated, onProviderResponded }) {
  const [phase, setPhase] = useState('searching'); // searching | found | none | favorites
  const [nearestProvider, setNearestProvider] = useState(null);
  const [secondProvider, setSecondProvider] = useState(null);
  const [estMin, setEstMin] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [confirming, setConfirming] = useState(false);
  const processingRef = useRef(false);
  const phaseRef = useRef('searching');
  const [allUnavailabilities, setAllUnavailabilities] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [busyAlertId, setBusyAlertId] = useState(null);
  const busyAlertCreated = useRef(false);
  const [zoomedFavPhoto, setZoomedFavPhoto] = useState(null);
  const [favoriteSkillError, setFavoriteSkillError] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutos

  const [currentRadius, setCurrentRadius] = useState(15);

  useEffect(() => {
    // Busca favoritos com dados atualizados dos prestadores
    base44.auth.me().catch(() => null).then(async u => {
      if (u?.id) {
        try {
          const favs = await base44.entities.Favorite.filter({ client_id: u.id });
          if (!favs?.length) { setFavorites([]); return; }
          const providerIds = [...new Set(favs.map(f => f.provider_id).filter(Boolean))];
          const providers = await Promise.all(
            providerIds.map(id => base44.entities.Provider.filter({ id }).then(r => r[0]).catch(() => null))
          );
          const providerMap = Object.fromEntries(providers.filter(Boolean).map(p => [p.id, p]));
          setFavorites(favs.map(f => ({
            ...f,
            provider_photo_url: providerMap[f.provider_id]?.photo_url || f.provider_photo_url,
            provider_name: providerMap[f.provider_id]?.name || f.provider_name,
            provider_rating: providerMap[f.provider_id]?.rating || f.provider_rating,
            provider_city: providerMap[f.provider_id]?.city || f.provider_city,
          })));
        } catch { setFavorites([]); }
      }
    });

    // Inicia busca de prestadores imediatamente
    phaseRef.current = 'searching';
    setPhase('searching');
    setCurrentRadius(5);
    searchProviders(5);
    
    // Expande raio a cada 30 segundos se nenhum prestador encontrado
    const radiusExpansionInterval = setInterval(() => {
      setCurrentRadius(prev => {
        const newRadius = prev + 5;
        console.log(`[search] 📍 Expandindo raio de busca para ${newRadius}km...`);
        searchProviders(newRadius);
        return newRadius;
      });
    }, 30000);
    
    // Contagem regressiva dos 5 minutos
    const countdownInterval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          clearInterval(radiusExpansionInterval);
          if (processingRef.current === false && phaseRef.current === 'searching') {
            console.log('[search] ⏱️ 5 minutos atingidos, abrindo agendamento...');
            phaseRef.current = 'none';
            setPhase('none');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(radiusExpansionInterval);
    };
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

  // Mapeamento service_type (snake_case) → labels das especialidades do prestador
  const SPECIALTY_MAP = {
    eletrica: ['Elétrica', 'Eletrica'],
    hidraulica: ['Hidráulica', 'Hidraulica'],
    pintura: ['Pintura'],
    montagem: ['Montagem'],
    reparo_geral: ['Reparo Geral'],
    alvenaria: ['Alvenaria'],
    fechadura: ['Fechadura / Serralheria', 'Fechadura', 'Serralheria'],
    ar_condicionado: ['Ar Condicionado'],
    limpeza_caixa_dagua: ["Limpeza Caixa d'Água", 'Limpeza Caixa de Agua'],
    limpeza_calha: ['Limpeza de Calha', 'Limpeza Calha'],
    substituicao_telha: ['Substituição de Telha'],
    limpeza_telhado: ['Limpeza de Telhado', 'Limpeza Telhado'],
    instalacao_coifa_parede: ['Coifa de Parede'],
    instalacao_coifa_ilha: ['Coifa Ilha'],
    conversao_vaso_coplado: ['Conversão Vaso CX Acoplada'],
    instalacao_vaso_monobloco: ['Vaso Monobloco'],
    reparo_forro_gesso: ['Reparo Forro de Gesso'],
    desentupimento: ['Desentupimento'],
    troca_pneu: ['Troca de Pneu'],
    recarga_bateria: ['Recarga de Bateria'],
    conserto_pneu: ['Conserto de Pneu'],
    reboque: ['Reboque'],
    veiculo_outros: ['Veículo Outros'],
    caca_vazamento: ['Caça Vazamento'],
    checkup: ['Check-up', 'Checkup'],
    portao_eletronico: ['Portão Eletrônico'],
    interfone: ['Interfone'],
    rejunte: ['Rejunte'],
    pressurizador: ['Pressurizador'],
    alarme_cerca_eletrica: ['Alarme / Cerca Elétrica'],
    concertina: ['Concertina'],
    camera_cftv: ['Câmera / CFTV'],
    instalacao_suporte_tv: ['Instalação Suporte TV'],
    outros: ['Outros'],
  };

  const hasSpecialty = (provider, serviceType) => {
    if (!provider.specialties || !Array.isArray(provider.specialties)) return false;
    const validLabels = SPECIALTY_MAP[serviceType] || [serviceType];
    return provider.specialties.some(s => validLabels.includes(s));
  };

  const searchProviders = async (radiusKm = 15) => {
    // retorna Promise para uso no useEffect
    setPhase('searching');

    // Busca coords do cliente
    const clientCoords = await getClientCoords();

    // Depois busca prestadores online
    const onlineProvidersRaw = await base44.entities.Provider.filter({ is_online: true, is_approved: true });
    
    // Busca serviços em execução para identificar prestadores ocupados
    const activeRequests = await base44.entities.ServiceRequest.filter({ status: 'em_andamento' });
    const occupiedProviderIds = new Set(activeRequests.map(r => r.provider_id).filter(Boolean));
    
    // Filtra por especialidade compatível com o serviço solicitado
    const serviceType = Array.isArray(form.service_type) ? form.service_type[0] : form.service_type;
    const withSpecialty = serviceType
      ? onlineProvidersRaw.filter(p => hasSpecialty(p, serviceType))
      : onlineProvidersRaw;

    // Se nenhum prestador tem a especialidade cadastrada, usa todos os online aprovados como fallback
    const matchingProviders = withSpecialty.length > 0 ? withSpecialty : onlineProvidersRaw;

    console.log(`[search] ${withSpecialty.length}/${onlineProvidersRaw.length} prestadores têm a especialidade: ${serviceType}${withSpecialty.length === 0 ? ' → usando todos como fallback' : ''}`);

    // Separa prestadores: livres vs em execução
    const availableProviders = matchingProviders.filter(p => !occupiedProviderIds.has(p.id));
    const busyProviders = matchingProviders.filter(p => occupiedProviderIds.has(p.id));

    const clientLat = clientCoords?.lat || null;
    const clientLon = clientCoords?.lon || null;
    console.log('[search] clientCoords:', clientLat, clientLon, '| raio:', radiusKm, 'km');

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

    // Filtra por raio de busca
    const filterByRadius = (providers) => {
      return providers.filter(p => p.distance !== null && p.distance <= radiusKm);
    };

    // Se tem prestadores disponíveis (livres), mostra imediatamente
    if (availableProviders.length > 0) {
      const sorted = enrichWithDistance(availableProviders);
      const withinRadius = filterByRadius(sorted);
      if (withinRadius.length > 0) {
        setNearestProvider(withinRadius[0]);
        if (form.requires_two_providers && withinRadius.length > 1) {
          setSecondProvider(withinRadius[1]);
        }
        phaseRef.current = 'found';
        setPhase('found');
        return; // Sai aqui, não precisa criar BusyAlert
      }
    }

    // Nenhum prestador livre agora — notifica cliente que nenhum está disponível
    console.log('[search] ❌ Nenhum prestador LIVRE para especialidade:', serviceType);

    // Busca aprovados para tentar criar BusyAlert
    const allProviders = await base44.entities.Provider.filter({ is_approved: true });
    const unavails = await base44.entities.ProviderUnavailability.list();
    setAllUnavailabilities(unavails || []);
    console.log('[search] Total de prestadores aprovados:', allProviders.length);
    console.log('[search] Serviços em andamento:', activeRequests.length);

    // Cria BusyAlert para prestadores EM EXECUÇÃO próximos ao cliente
    // Só notifica se raio chegou a 20km ou mais (não no inicio com 5km)
    if (form.modality !== 'agendado' && !busyAlertCreated.current && busyProviders.length > 0 && radiusKm >= 20) {
      busyAlertCreated.current = true;
      const clientCoords2 = await getClientCoords();
      const cLat = clientCoords2?.lat || null;
      const cLon = clientCoords2?.lon || null;
      console.log('[busyalert] clientCoords:', cLat, cLon);
      
      // IDs de prestadores que estão em execução
      const occupiedProviderIds = new Set(activeRequests.map(r => r.provider_id).filter(Boolean));
      console.log('[busyalert] Prestadores em execução:', occupiedProviderIds.size);
      
      // Filtra apenas prestadores com a especialidade correta
      const matchingAll = serviceType
        ? allProviders.filter(p => hasSpecialty(p, serviceType))
        : allProviders;

      // Usa busyProviders se disponível, senão filtra manualmente
      const occupiedToCheck = busyProviders.length > 0 
        ? busyProviders 
        : matchingAll.filter(p => occupiedProviderIds.has(p.id));
      
      const sorted = enrichWithDistance(occupiedToCheck);
      const nearbyOccupied = sorted
        .filter(p => {
          if (!p.latitude || !p.longitude) {
            console.log('[busyalert] prestador sem coords:', p.name);
            return false;
          }
          const d = calcDistance(cLat, cLon, p.latitude, p.longitude);
          const isOccupied = occupiedProviderIds.has(p.id);
          console.log('[busyalert] prestador:', p.name, '| ocupado:', isOccupied, '| dist:', d?.toFixed(1), 'km | qualifica:', isOccupied && d <= 30);
          return d !== null && d <= 30 && isOccupied;
        })
        .slice(0, 5);

      console.log('[busyalert] nearbyOccupied encontrados:', nearbyOccupied.length, nearbyOccupied.map(p => p.name));

      if (nearbyOccupied.length > 0) {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const serviceTypes = Array.isArray(form.service_type) ? form.service_type : [form.service_type];
        const newAlert = await base44.entities.BusyAlert.create({
          client_name: form.client_name || 'Cliente',
          client_phone: form.client_phone || '',
          service_type: serviceTypes[0],
          service_description: form.description || '',
          client_latitude: cLat,
          client_longitude: cLon,
          client_address: [form.address, form.number, form.neighborhood, form.city].filter(Boolean).join(', '),
          status: 'aguardando',
          notified_provider_ids: nearbyOccupied.map(p => p.id),
          responses: [],
          expires_at: expiresAt,
        });
        console.log('[busyalert] ✅ Alerta criado:', newAlert.id, 'notificando:', nearbyOccupied.map(p => p.name).join(', '));
        setBusyAlertId(newAlert.id);
        if (onBusyAlertCreated) onBusyAlertCreated(newAlert.id);
      } else {
        console.log('[busyalert] ❌ Nenhum prestador em execução próximo');
      }
    }

    // Mantém em 'searching' - agendamento será aberto após 5 minutos pelo timer
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
    setFavoriteSkillError(null);

    // Busca dados completos do prestador favorito
    const providerList = await base44.entities.Provider.filter({ id: selectedFavorite.provider_id });
    const provider = providerList[0] || null;

    // Verifica se o prestador tem a especialidade do serviço solicitado
    const serviceType = Array.isArray(form.service_type) ? form.service_type[0] : form.service_type;
    if (provider && serviceType && !hasSpecialty(provider, serviceType)) {
      const SPECIALTY_MAP_LABELS = {
        eletrica: 'Elétrica', hidraulica: 'Hidráulica', pintura: 'Pintura',
        montagem: 'Montagem', reparo_geral: 'Reparo Geral', alvenaria: 'Alvenaria',
        fechadura: 'Fechadura', ar_condicionado: 'Ar Condicionado',
        limpeza_caixa_dagua: "Limpeza Caixa d'Água", limpeza_calha: 'Limpeza de Calha',
        substituicao_telha: 'Substituição de Telha', limpeza_telhado: 'Limpeza de Telhado',
        instalacao_coifa_parede: 'Coifa de Parede', instalacao_coifa_ilha: 'Coifa Ilha',
        conversao_vaso_coplado: 'Conversão Vaso CX Acoplada', instalacao_vaso_monobloco: 'Vaso Monobloco',
        reparo_forro_gesso: 'Reparo Forro de Gesso', desentupimento: 'Desentupimento',
        troca_pneu: 'Troca de Pneu', recarga_bateria: 'Recarga de Bateria',
        conserto_pneu: 'Conserto de Pneu', reboque: 'Reboque',
        veiculo_outros: 'Veículo Outros', caca_vazamento: 'Caça Vazamento',
        checkup: 'Check-up', portao_eletronico: 'Portão Eletrônico',
        interfone: 'Interfone', rejunte: 'Rejunte', pressurizador: 'Pressurizador',
        alarme_cerca_eletrica: 'Alarme / Cerca Elétrica', concertina: 'Concertina',
        camera_cftv: 'Câmera / CFTV', instalacao_suporte_tv: 'Instalação Suporte TV',
        outros: 'Outros',
      };
      const serviceLabel = SPECIALTY_MAP_LABELS[serviceType] || serviceType;
      setFavoriteSkillError(`${provider.name || 'Este prestador'} não possui a habilidade "${serviceLabel}" cadastrada na ficha. Escolha outro prestador ou use a busca automática.`);
      return;
    }

    processingRef.current = true;
    setConfirming(true);
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
    <>
    {zoomedFavPhoto && <PhotoZoom src={zoomedFavPhoto} alt="Foto do prestador" onClose={() => setZoomedFavPhoto(null)} />}
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden">

        {/* Tabs: Busca automática / Favoritos */}
        {favorites.length > 0 && (
          <div className="flex border-b border-border">
            <button
              onClick={() => { setPhase(nearestProvider ? 'found' : 'none'); setSelectedFavorite(null); }}
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
                  onClick={() => { setSelectedFavorite(fav); setFavoriteSkillError(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left",
                    selectedFavorite?.id === fav.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <div
                    className={cn("w-14 h-14 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border relative group", fav.provider_photo_url && "cursor-zoom-in")}
                    onClick={fav.provider_photo_url ? (e) => { e.stopPropagation(); setZoomedFavPhoto(fav.provider_photo_url); } : undefined}
                  >
                    {fav.provider_photo_url ? (
                      <>
                        <img src={fav.provider_photo_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                          <span className="text-white text-lg">🔍</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-primary">{fav.provider_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{fav.provider_name}</p>
                    {/* Estrelas */}
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const r = fav.provider_rating || 5;
                        const full = Math.floor(r);
                        const half = r - full >= 0.5;
                        return (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < full ? "text-yellow-400 fill-yellow-400"
                              : i === full && half ? "text-yellow-400 fill-yellow-200"
                              : "text-gray-300 fill-gray-100"
                            )}
                          />
                        );
                      })}
                      <span className="text-xs font-semibold text-foreground ml-0.5">{(fav.provider_rating || 5).toFixed(1)}</span>
                    </div>
                    {/* Nível */}
                    <div className="mt-1">
                      <ProviderLevelBadge providerId={fav.provider_id} size="sm" />
                    </div>
                    {fav.provider_city && <span className="text-xs text-muted-foreground">{fav.provider_city}</span>}
                  </div>
                  {selectedFavorite?.id === fav.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {favoriteSkillError && (
              <div className="mt-3 bg-red-50 border border-red-300 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{favoriteSkillError}</p>
              </div>
            )}
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
            <div className="p-4 text-center">
              <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="relative w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground">Buscando prestadores</h3>
              <p className="text-muted-foreground mt-1 text-xs">Localizando profissionais disponíveis...</p>

              {/* Raio de busca */}
              <div className="mt-2 mb-2">
                <p className="text-xs font-semibold text-primary">📍 Raio: {currentRadius}km</p>
                <p className="text-[10px] text-muted-foreground">Expandindo a cada 30s...</p>
              </div>

              {/* Contagem regressiva */}
              <div className="mt-2 mb-2">
                <div className="text-3xl font-black text-primary">
                  {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
                </div>
                <p className="text-[10px] text-muted-foreground">até agendamento</p>
              </div>

              <p className="text-[10px] text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-2">
                Prestador ocupado pode responder em breve
              </p>
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
             <div className="bg-orange-50 px-4 py-3 border-b border-border">
               <div className="flex items-center gap-2 text-orange-700 mb-1">
                 <AlertCircle className="w-4 h-4" />
                 <span className="font-bold text-sm">Nenhum prestador disponível agora</span>
               </div>
               <p className="text-xs text-orange-700/80">
                 Todos estão ocupados. Agende para outro horário!
               </p>
             </div>
             <div className="px-4 py-3 space-y-3">
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
              {busyAlertId && (
                <BusyAlertClientView
                  alertId={busyAlertId}
                  form={form}
                  onProviderResponded={() => onClose && onClose()}
                  onConfirm={(formData) => {
                    if (confirming || processingRef.current) return;
                    processingRef.current = true;
                    setConfirming(true);
                    onConfirm(formData);
                  }}
                />
              )}
              <button onClick={onClose} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Botão fechar quando buscando (caso queira cancelar) */}
        {phase === 'searching' && (
          <div className="px-6 pb-6">
            {busyAlertId && (
              <BusyAlertClientView
                alertId={busyAlertId}
                form={form}
                onProviderResponded={() => onClose && onClose()}
                onConfirm={(formData) => {
                  if (confirming || processingRef.current) return;
                  processingRef.current = true;
                  setConfirming(true);
                  onConfirm(formData);
                }}
              />
            )}
            <button onClick={onClose} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-2 mt-2">
              Cancelar busca
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}