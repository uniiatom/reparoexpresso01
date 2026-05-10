import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Clock, CheckCircle2, Wrench, Star, BellRing, X, Check, ClipboardList, Calendar, CalendarOff, PauseCircle } from "lucide-react";
import ProviderUnavailabilitySection from '../components/ProviderUnavailabilitySection';
import GoogleReviewQRCode from '../components/GoogleReviewQRCode';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import ProviderSetupModal from '../components/ProviderSetupModal';
import NewJobBanner from '../components/NewJobBanner';
import { useNewJobAlert } from '../hooks/useNewJobAlert';
import ServiceChecklist from '../components/ServiceChecklist';
import AdditionalPointModal from '../components/AdditionalPointModal';
import ActiveJobCard from '../components/ActiveJobCard';
import DeclineReasonModal from '../components/DeclineReasonModal';
import ProviderPhotoEditor from '../components/ProviderPhotoEditor';
import CashbackPanel from '../components/CashbackPanel';
import ProviderReserveFund from '../components/ProviderReserveFund';
import ProviderLevelIncentive from '../components/ProviderLevelIncentive';
import ProviderLevelBadge from '../components/ProviderLevelBadge';
import InvoiceManager from '../components/InvoiceManager';
import BatchProviderChat from '../components/BatchProviderChat';
import BusyAlertBanner from '../components/BusyAlertBanner';
import ProviderTermsNotificationBanner from '../components/ProviderTermsNotificationBanner';
import ProviderNotificationCenter from '../components/ProviderNotificationCenter';
import ProviderTermsTab from '../components/ProviderTermsTab';
import { useProviderPush } from '../hooks/useProviderPush';
import NewServiceFullscreenModal from '@/components/NewServiceFullscreenModal';
import ProviderDailyRouteMap from '@/components/ProviderDailyRouteMap';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

const URGENCY_LABELS = { agora: "🔥 Urgente", hoje: "⏰ Hoje", esta_semana: "📅 Esta semana" };

export default function ProviderApp() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [jobQueue, setJobQueue] = useState([]); // fila de jobs para o banner
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAdditionalPoint, setShowAdditionalPoint] = useState(false);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'chamados');
  const [declineTarget, setDeclineTarget] = useState(null); // { job, source: 'banner' | 'list' }
  const [fullscreenService, setFullscreenService] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const { data: provider } = useQuery({
    queryKey: ['my-provider'],
    queryFn: async () => {
      if (!user?.email) return null;
      const list = await base44.entities.Provider.filter({ user_id: user.id });
      return list[0] || null;
    },
    enabled: !!user,
  });

  const handleNewJob = useCallback((job) => {
    setJobQueue(prev => {
      // Evita duplicatas na fila
      if (prev.some(j => j.id === job.id)) return prev;
      return [...prev, job];
    });
  }, []);

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!provider?.is_online || !provider?.is_approved) {
      setRequests([]);
      return;
    }
    // Carga inicial
    base44.entities.ServiceRequest.filter({ status: 'aguardando' }).then(all => {
      setRequests(all.filter(r => !r.provider_id || r.provider_id !== provider?.id));
    });
    // Tempo real via subscribe
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      setRequests(prev => {
        if (event.type === 'delete') return prev.filter(r => r.id !== event.id);
        const isAvailable = event.data?.status === 'aguardando' && (!event.data?.provider_id || event.data?.provider_id !== provider?.id);
        if (!isAvailable) return prev.filter(r => r.id !== event.id);
        const exists = prev.some(r => r.id === event.id);
        if (exists) return prev.map(r => r.id === event.id ? event.data : r);
        return [...prev, event.data];
      });
    });
    return unsub;
  }, [provider?.is_online, provider?.is_approved, provider?.id]);

  const [myJobs, setMyJobs] = useState([]);
  // em_espera: job pausado (não bloqueia aceitar novos chamados)
  const activeJob = myJobs.find(j => ['aceito', 'a_caminho', 'em_andamento', 'em_espera'].includes(j.status));
  const waitingJob = myJobs.find(j => j.status === 'em_espera');
  const realActiveJob = myJobs.find(j => ['aceito', 'a_caminho', 'em_andamento'].includes(j.status));

  // Job atual no banner = primeiro da fila
  const incomingJob = jobQueue[0] || null;

  // Hook para novos chamados — dispara modal fullscreen
  useNewJobAlert({
    enabled: !!(provider?.is_online && provider?.is_approved),
    onNewJob: (newJob) => {
      handleNewJob(newJob);
      setFullscreenService(newJob);
    },
    providerId: provider?.id,
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Registra Web Push para notificações com tela bloqueada
  useProviderPush({
    providerId: provider?.id,
    enabled: !!(provider?.is_online && provider?.is_approved),
  });

  useEffect(() => {
    if (!provider?.id) return;
    // Carga inicial — busca jobs atribuídos OU serviços agendados (status 'agendado')
    Promise.all([
      base44.entities.ServiceRequest.filter({ provider_id: provider.id }, '-created_date', 100),
      base44.entities.ServiceRequest.filter({ status: 'agendado' }, '-created_date', 50),
    ]).then(([jobs, scheduled]) => {
      const combined = [...jobs, ...scheduled.filter(s => s.provider_id !== provider.id)];
      setMyJobs(combined);
    });
    
    // Real-time via subscribe
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (!['create', 'update', 'delete'].includes(event.type)) return;
      const isMyJob = event.data?.provider_id === provider.id;
      const isScheduledJob = event.data?.status === 'agendado'; // Serviços agendados para o futuro
      if (!isMyJob && !isScheduledJob) return;
      
      setMyJobs(prev => {
        if (event.type === 'delete') return prev.filter(j => j.id !== event.id);
        // Para create e update: upsert — adiciona se não existir, atualiza se existir
        const exists = prev.some(j => j.id === event.id);
        if (exists) return prev.map(j => j.id === event.id ? event.data : j);
        return [...prev, event.data];
      });
    });
    return unsub;
  }, [provider?.id]);

  const toggleOnline = useMutation({
    mutationFn: (val) => {
      const updateData = { is_online: val };
      // Ao ficar online, capturar localização GPS do prestador
      if (val && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          base44.entities.Provider.update(provider.id, {
            is_online: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }, null, { enableHighAccuracy: true, timeout: 8000 });
      }
      return base44.entities.Provider.update(provider.id, updateData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-provider'] }),
  });

  const acceptJob = useMutation({
    mutationFn: async (reqId) => {
      const updateData = {
        status: 'aceito',
        provider_id: provider?.id,
        provider_name: provider?.name,
        provider_phone: provider?.phone,
      };

      // Usa OSRM para calcular duração real por estradas (como Google Maps)
      const getRoadDurationMinutes = async (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
            { signal: AbortSignal.timeout(8000) }
          );
          const data = await res.json();
          if (data?.routes?.[0]?.duration) {
            return Math.max(1, Math.round(data.routes[0].duration / 60));
          }
        } catch (e) {
          console.warn('[OSRM] fallback to haversine:', e.message);
        }
        // Fallback: distância reta + 30% de tortuosidade / velocidade média urbana 50 km/h
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.max(2, Math.round((distKm * 1.3 / 50) * 60));
      };

      // Geocodifica endereço via Nominatim com múltiplos fallbacks
      const geocode = async (query) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`, {
          headers: { 'Accept-Language': 'pt-BR' }
        });
        const data = await res.json();
        if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        return null;
      };

      const geocodeClient = async (req) => {
        // Tenta 1: CEP via ViaCEP + endereço
        if (req.cep) {
          const cleanCep = req.cep.replace(/\D/g, '');
          if (cleanCep.length === 8) {
            const cepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const cepData = await cepRes.json();
            if (!cepData.erro) {
              const q1 = `${cepData.logradouro || ''}, ${req.number || ''}, ${cepData.bairro || ''}, ${cepData.localidade}, ${cepData.uf}, Brasil`;
              const r1 = await geocode(q1);
              if (r1) { console.log('[geocode] CEP+endereço OK:', r1); return r1; }
              // Tenta 2: só CEP
              const r2 = await geocode(`${cleanCep}, Brasil`);
              if (r2) { console.log('[geocode] CEP simples OK:', r2); return r2; }
            }
          }
        }
        // Tenta 3: endereço completo
        if (req.address) {
          const q3 = [req.address, req.number, req.neighborhood, req.city, req.state, 'Brasil'].filter(Boolean).join(', ');
          const r3 = await geocode(q3);
          if (r3) { console.log('[geocode] endereço completo OK:', r3); return r3; }
        }
        // Tenta 4: só cidade
        if (req.city) {
          const r4 = await geocode(`${req.city}, ${req.state || ''}, Brasil`);
          if (r4) { console.log('[geocode] cidade OK:', r4); return r4; }
        }
        console.warn('[geocode] falhou em todas as tentativas');
        return null;
      };

      // Captura GPS do prestador (timeout 8s, fallback para coords salvas no banco)
      const providerCoords = await new Promise((resolve) => {
        const fallback = () => {
          console.log('[GPS prestador] usando coords salvas:', provider?.latitude, provider?.longitude);
          resolve({ pLat: provider?.latitude || null, pLon: provider?.longitude || null });
        };
        if (!navigator.geolocation) { fallback(); return; }
        const timer = setTimeout(fallback, 8000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            console.log('[GPS prestador] obtido:', pos.coords.latitude, pos.coords.longitude);
            resolve({ pLat: pos.coords.latitude, pLon: pos.coords.longitude });
          },
          () => { clearTimeout(timer); fallback(); },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
        );
      });

      const { pLat, pLon } = providerCoords;
      if (pLat && pLon) {
        updateData.provider_latitude = pLat;
        updateData.provider_longitude = pLon;
      }

      // Busca dados da OS
      const req = await base44.entities.ServiceRequest.get(reqId);
      console.log('[acceptJob] OS:', req?.id, '| cep:', req?.cep, '| address:', req?.address, '| city:', req?.city, '| lat salva:', req?.latitude, req?.longitude);

      if (req) {
        let clientLat = req.client_latitude || req.latitude;
        let clientLon = req.client_longitude || req.longitude;

        // Geocodifica se não há coordenadas
        if (!clientLat || !clientLon) {
          console.log('[acceptJob] sem coords do cliente, geocodificando...');
          const geocoded = await geocodeClient(req);
          if (geocoded) {
            clientLat = geocoded.lat;
            clientLon = geocoded.lon;
            await base44.entities.ServiceRequest.update(reqId, { latitude: clientLat, longitude: clientLon });
          }
        }

        console.log('[acceptJob] pLat:', pLat, 'pLon:', pLon, '| clientLat:', clientLat, 'clientLon:', clientLon);

        const eta = await getRoadDurationMinutes(pLat, pLon, clientLat, clientLon);
        console.log('[acceptJob] ETA OSRM:', eta, 'min');

        if (eta != null) {
          updateData.estimated_arrival_minutes = eta;
        } else {
          console.warn('[acceptJob] não foi possível calcular ETA — sem coordenadas suficientes');
        }
      }

      return base44.entities.ServiceRequest.update(reqId, updateData);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['available-requests'] });
      // Limpa TODA a fila ao aceitar
      window.__clearSeenJobIds?.();
      setJobQueue([]);
      toast.success("Chamado aceito! Vá até o cliente.");
    },
  });

  const handleAcceptBanner = (job) => {
    if (!job) return;
    window.__stopProviderHorn?.();
    window.__markJobSeen?.(job.id); // marca como visto antes do update chegar
    setJobQueue([]);
    setFullscreenService(null);
    setActiveTab('chamados');
    setRequests(prev => prev.filter(r => r.id !== job.id));
    acceptJob.mutate(job.id);
  };

  const declineJob = useMutation({
    mutationFn: (reqId) => base44.entities.ServiceRequest.update(reqId, {
      status: 'aguardando',
      provider_id: null,
      provider_name: null,
      provider_phone: null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.info("Chamado recusado.");
    },
  });

  const handleDeclineBanner = (job) => {
    setDeclineTarget({ job, source: 'banner' });
  };

  const handleDeclineList = (req) => {
    setDeclineTarget({ job: req, source: 'list' });
  };

  const handleDeclineConfirm = (reason) => {
    const { job, source } = declineTarget;
    window.__stopProviderHorn?.();

    // Remove de todas as listas (fila, disponíveis, modal)
    setJobQueue(prev => prev.filter(j => j.id !== job?.id));
    setRequests(prev => prev.filter(r => r.id !== job.id));
    setFullscreenService(null);

    // Salva o motivo e reseta o status para aguardando (recusa efetiva)
    const updateData = { status: 'aguardando', provider_id: null, provider_name: null, provider_phone: null };
    if (reason) updateData.decline_reason = reason;
    base44.entities.ServiceRequest.update(job.id, updateData);

    toast.info(reason ? `Chamado recusado: ${reason}` : "Chamado recusado.");
    setDeclineTarget(null);
  };

  const updateJobStatus = useMutation({
    mutationFn: ({ id, status, final_price }) => base44.entities.ServiceRequest.update(id, { status, ...(final_price && { final_price }) }),
  });

  // Banner só bloqueia se há job realmente ativo (não em espera)
  const shouldShowBanner = !realActiveJob;
  const completedJobs = myJobs.filter(j => j.status === 'concluido');
  // OS na fila: atribuídas ao prestador mas ainda aguardando (não ativas nem concluídas nem agendadas)
  const queuedJobs = myJobs.filter(j => j.status === 'aguardando');
  // Serviços agendados — ordenados por data
  const scheduledJobs = myJobs
    .filter(j => j.status === 'agendado')
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));

  // Para a buzina automaticamente se o prestador já tem um job realmente ativo (não em espera)
  useEffect(() => {
    if (realActiveJob) {
      window.__stopProviderHorn?.();
    }
  }, [realActiveJob?.id]);

  // Emite som quando há serviço agendado aguardando aceite
  const hasPlayedAlertRef = useRef(false);
  useEffect(() => {
    if (scheduledJobs.length > 0 && provider?.is_online && provider?.is_approved && !hasPlayedAlertRef.current) {
      hasPlayedAlertRef.current = true;
      // Toca som múltiplas vezes para garantir audição
      const playAlert = () => {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const now = audioContext.currentTime;
          
          // 3 beeps curtos
          for (let i = 0; i < 3; i++) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = 1200;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0.8, now + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.2);
            
            osc.start(now + i * 0.3);
            osc.stop(now + i * 0.3 + 0.2);
          }
        } catch (e) {
          console.log('Alerta sonoro não disponível:', e.message);
        }
      };
      
      // Tenta tocar imediatamente e depois em 1 segundo
      setTimeout(playAlert, 100);
      setTimeout(playAlert, 1100);
    }
  }, [scheduledJobs.length, provider?.is_online, provider?.is_approved]);

  if (!provider) {
    return <ProviderSetupModal user={user} onCreated={() => queryClient.invalidateQueries({ queryKey: ['my-provider'] })} />;
  }

  if (provider?.is_blocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-destructive/20">
          <div className="text-center space-y-4">
            <div className="text-6xl">🚫</div>
            <h1 className="text-2xl font-bold text-destructive">Sua conta foi bloqueada</h1>
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 space-y-2">
              <p className="text-sm text-destructive font-semibold">Motivo do bloqueio:</p>
              <p className="text-sm text-foreground">{provider.block_reason || 'Bloqueado pelo administrador'}</p>
            </div>
            <p className="text-muted-foreground text-sm">Se acredita que há um erro, entre em contato com o suporte.</p>
            <Button variant="outline" onClick={() => base44.auth.logout()}>
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!provider.is_approved) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-yellow-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Aguardando aprovação</h2>
          <p className="text-muted-foreground mt-2 text-sm">Sua conta está sendo analisada pela Escola Prática. Somente profissionais homologados pela escola podem atuar na plataforma. Você receberá uma notificação em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Lightbox para ampliar fotos */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/70 hover:bg-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold transition-colors z-[10000]"
            onClick={() => setLightboxUrl(null)}
          >
            ×
          </button>
          <img
            src={lightboxUrl}
            alt="Foto ampliada"
            className="max-w-[95vw] max-h-[95vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Fullscreen Modal para novo serviço */}
      {fullscreenService && (
        <NewServiceFullscreenModal
          service={fullscreenService}
          onAccept={handleAcceptBanner}
          onDecline={() => {
            setFullscreenService(null);
            handleDeclineBanner(fullscreenService);
          }}
        />
      )}

      {/* Banner de notificação dos termos atualizados */}
      <ProviderTermsNotificationBanner />

      {/* Mensagem de incentivo de nível */}
      <ProviderLevelIncentive providerId={provider?.id} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Olá, {provider.name.split(' ')[0]}!</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex gap-1 items-center">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={cn("w-3.5 h-3.5", s <= Math.round(provider.rating || 5) ? "text-yellow-400 fill-yellow-400" : "text-muted")} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">{provider.total_jobs || 0} serviços</span>
              <ProviderLevelBadge providerId={provider.id} size="sm" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProviderNotificationCenter providerId={provider?.id} />
          <Label htmlFor="online-toggle" className={cn("text-sm font-semibold", provider.is_online ? "text-primary" : "text-muted-foreground")}>
            {provider.is_online ? "Online" : "Offline"}
          </Label>
          <Switch
            id="online-toggle"
            checked={provider.is_online}
            onCheckedChange={(val) => toggleOnline.mutate(val)}
          />
        </div>
      </div>

      {/* Nível do Prestador — card com progressão */}
      <div className="mb-4">
        <ProviderLevelBadge providerId={provider.id} showDetails={true} />
      </div>

      {/* Abas de navegação - linha 1 */}
      <div className="flex gap-1 mb-1 bg-muted rounded-2xl p-1">
        <button
          onClick={() => setActiveTab('chamados')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'chamados' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          🔔 Chamados
        </button>
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all relative ${activeTab === 'agenda' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          📅 Agenda
          {scheduledJobs.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {scheduledJobs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'checklist' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          ✅ Checklist
        </button>
      </div>
      {/* Abas de navegação - linha 2 */}
      <div className="flex gap-1 mb-5 bg-muted rounded-2xl p-1">
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'historico' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          📋 Histórico
        </button>
        <button
          onClick={() => setActiveTab('termos')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'termos' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          ⚖️ Termos
        </button>
        <button
          onClick={() => setActiveTab('notas')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'notas' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          🧾 Notas
        </button>
        <button
          onClick={() => setActiveTab('indisponibilidade')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'indisponibilidade' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          🚫 Folgas
        </button>
        <button
          onClick={() => setActiveTab('fotos')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'fotos' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          📷 Fotos
        </button>
        <button
          onClick={() => setActiveTab('fundo')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'fundo' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          🔐 Fundo
        </button>
      </div>

      {/* ── ABA CHAMADOS ── */}
      {activeTab === 'chamados' && <>

      {/* Alertas de clientes aguardando (todos prestadores ocupados) */}
      <BusyAlertBanner provider={provider} />

      {/* Job em espera (pausado) — sempre visível, mesmo com outro job ativo */}
      {waitingJob && !realActiveJob && (
        <ActiveJobCard
          job={waitingJob}
          providerName={provider.name}
          onUpdateStatus={updateJobStatus.mutate}
          onShowChecklist={() => setShowChecklist(true)}
          onShowAdditionalPoint={() => setShowAdditionalPoint(true)}
          isPending={updateJobStatus.isPending}
        />
      )}

      {/* Job em espera — banner de aviso quando há outro job ativo */}
      {waitingJob && realActiveJob && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-2xl p-3 flex items-center gap-3">
          <PauseCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-yellow-800">Serviço em espera</p>
            <p className="text-xs text-yellow-700 truncate">{waitingJob.client_name} · {waitingJob.address}</p>
          </div>
        </div>
      )}

      {/* Job ativo */}
      {realActiveJob && (
        <ActiveJobCard
          job={realActiveJob}
          providerName={provider.name}
          onUpdateStatus={updateJobStatus.mutate}
          onShowChecklist={() => setShowChecklist(true)}
          onShowAdditionalPoint={() => setShowAdditionalPoint(true)}
          isPending={updateJobStatus.isPending}
        />
      )}

      {/* Chat entre prestadores do mesmo lote */}
      {(() => {
        const activeJobs = myJobs.filter(j => ['aceito', 'a_caminho', 'em_andamento', 'em_espera'].includes(j.status));
        if (activeJobs.length < 2) return null;
        return (
          <BatchProviderChat
            batchRequests={activeJobs}
            senderRole="prestador"
            senderName={provider.name}
          />
        );
      })()}

      {/* ── FILA DE OS ATRIBUÍDAS ── */}
      {queuedJobs.length > 0 && (
        <div className="mb-5">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Fila de OS
            <Badge className="bg-orange-500 text-white text-xs">{queuedJobs.length}</Badge>
          </h2>
          <div className="relative">
            {/* Linha vertical da timeline */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-3">
              {queuedJobs.map((job, idx) => (
                <div key={job.id} className="flex gap-4 relative">
                {/* Bolinha da timeline */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${idx === 0 ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'}`}>
                  <span className="text-xs font-bold">{idx + 1}</span>
                </div>
                <div className={`flex-1 bg-card rounded-2xl p-4 border ${idx === 0 ? 'border-primary/40 shadow-sm' : 'border-border'}`}>
                  <div className="flex items-start justify-between mb-1 flex-wrap gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm">{SERVICE_LABELS[job.service_type] || job.service_type}</span>
                      {job.description?.startsWith('RETORNO GARANTIA') && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-300">🛡️ Garantia</span>
                      )}
                      {job.description?.startsWith('RETORNO POR PEÇA') && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-300">🔧 Por Peça</span>
                      )}
                    </div>
                    {idx === 0 && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Próxima</span>}
                  </div>
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{job.description}</p>
                    {job.problem_photos?.length > 0 && (
                      <div className="flex gap-1.5 mb-1.5 overflow-x-auto pb-0.5">
                        {job.problem_photos.map((url, i) => (
                          <img key={i} src={url} alt={`Foto ${i+1}`} className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-border" />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.address}{job.city ? `, ${job.city}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {job.client_name} · {job.client_phone}
                    </p>
                    <div className="flex gap-2 mt-3">
                      {(job.description?.includes('RETORNO') || job.status === 'agendado') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl text-muted-foreground hover:bg-muted text-xs"
                          onClick={() => {
                            // Link para suporte ou chat
                            window.open(`https://wa.me/?text=Olá, tenho dúvida sobre o serviço ${job.service_number || job.id}`, '_blank');
                          }}
                        >
                          💬 Suporte
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl border-destructive text-destructive hover:bg-destructive/5 text-xs"
                        onClick={() => handleDeclineList(job)}
                      >
                        <X className="w-3 h-3 mr-1" /> Recusar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
                        onClick={() => {
                          window.__stopProviderHorn?.();
                          window.__markJobSeen?.(job.id);
                          setJobQueue(prev => prev.filter(j => j.id !== job.id));
                          acceptJob.mutate(job.id);
                        }}
                        disabled={acceptJob.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" /> Aceitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chamados disponíveis - sempre mostra quando online */}
      {provider.is_online && (
        <div className="mb-5">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" />
            Chamados disponíveis
            {requests.length > 0 && <Badge className="bg-primary text-primary-foreground text-xs">{requests.length}</Badge>}
          </h2>
          {requests.length === 0 ? (
            <div className="bg-card rounded-3xl p-8 border border-border text-center">
              <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Wrench className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum chamado disponível agora.<br />Fique online para receber novos pedidos!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="bg-card rounded-3xl p-5 border border-border">
                  <div className="flex items-start justify-between mb-2 flex-wrap gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">{SERVICE_LABELS[req.service_type]}</span>
                      {req.description?.startsWith('RETORNO GARANTIA') && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700 border border-orange-300">🛡️ Retorno Garantia</span>
                      )}
                      {req.description?.startsWith('RETORNO POR PEÇA') && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-300">🔧 Retorno por Peça</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">{URGENCY_LABELS[req.urgency]}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{req.description}</p>
                  {req.problem_photos?.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                      {req.problem_photos.map((url, i) => (
                        <img 
                          key={i} 
                          src={url} 
                          alt={`Foto ${i+1}`} 
                          onClick={() => setLightboxUrl(url)}
                          className="w-16 h-16 object-cover rounded-xl flex-shrink-0 border border-border cursor-pointer hover:opacity-75 transition-opacity" 
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {req.address}{req.city ? `, ${req.city}` : ''}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl border-destructive text-destructive hover:bg-destructive/5"
                      onClick={() => handleDeclineList(req)}
                    >
                      <X className="w-4 h-4 mr-1" /> Recusar
                    </Button>
                    <Button
                      className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold"
                      onClick={() => {
                        window.__stopProviderHorn?.();
                        window.__markJobSeen?.(req.id);
                        setJobQueue(prev => prev.filter(j => j.id !== req.id));
                        acceptJob.mutate(req.id);
                      }}
                      disabled={acceptJob.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" /> Aceitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!provider.is_online && !activeJob && (
        <div className="bg-card rounded-3xl p-8 border border-border text-center mb-5">
          <div className="w-14 h-14 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Wrench className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">Você está offline</p>
          <p className="text-sm text-muted-foreground mt-1">Ative o botão acima para receber chamados</p>
        </div>
      )}

      {/* QR Code Avaliação Google */}
      <div className="mb-5 flex justify-center">
        <GoogleReviewQRCode />
      </div>

      </> /* fim aba chamados */}

      {/* ── ABA AGENDA ── */}
      {activeTab === 'agenda' && (
        <div className="space-y-5">
          {scheduledJobs.length > 0 && (
            <ProviderDailyRouteMap 
              providerId={provider?.id}
              currentLocation={provider?.latitude && provider?.longitude ? {
                latitude: provider.latitude,
                longitude: provider.longitude,
              } : null}
            />
          )}
          <p className="text-sm text-muted-foreground">
            Serviços agendados confirmados para você. Apareça no local na data e horário combinados.
          </p>
          {scheduledJobs.length === 0 ? (
            <div className="bg-card rounded-3xl p-10 border border-border text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">Nenhum agendamento</p>
              <p className="text-sm text-muted-foreground mt-1">Serviços agendados aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledJobs.map(job => {
                const dateStr = job.scheduled_date
                  ? new Date(job.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
                  : '—';
                return (
                  <div key={job.id} className="bg-card rounded-2xl p-4 border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-foreground text-sm">{SERVICE_LABELS[job.service_type] || job.service_type}</span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {dateStr}{job.scheduled_time ? ` · ${job.scheduled_time}` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{job.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.address}{job.neighborhood ? `, ${job.neighborhood}` : ''}{job.city ? ` — ${job.city}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {job.client_name} · {job.client_phone}
                    </p>
                    {job.service_number && (
                      <p className="text-xs font-mono text-primary/70 mt-1">{job.service_number}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl text-muted-foreground hover:bg-muted text-xs"
                        onClick={() => {
                          window.open(`https://wa.me/?text=Olá, tenho dúvida sobre o serviço ${job.service_number || job.id}`, '_blank');
                        }}
                      >
                        💬 Suporte
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
                        onClick={() => {
                          window.__stopProviderHorn?.();
                          window.__markJobSeen?.(job.id);
                          setJobQueue(prev => prev.filter(j => j.id !== job.id));
                          acceptJob.mutate(job.id);
                        }}
                        disabled={acceptJob.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" /> Aceitar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA CHECK-LIST ── */}
      {activeTab === 'checklist' && (
        <div>
          {activeJob ? (
            <div className="space-y-4">
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
                <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Serviço em andamento</p>
                <p className="font-bold text-foreground">{SERVICE_LABELS[activeJob.service_type] || activeJob.service_type}</p>
                <p className="text-sm text-muted-foreground">{activeJob.client_name} · {activeJob.address}</p>
              </div>
              {activeJob.checklist?.items?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Itens preenchidos:</p>
                  {activeJob.checklist.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${item.checked ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm ${item.checked ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                    </div>
                  ))}
                  {activeJob.checklist.notes && (
                    <div className="bg-muted rounded-xl p-3 text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">Observações:</p>
                      {activeJob.checklist.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-2xl p-6 border border-border text-center">
                  <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Checklist ainda não preenchido</p>
                </div>
              )}
              <Button
                className="w-full rounded-2xl font-bold"
                onClick={() => setShowChecklist(true)}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                {activeJob.checklist?.items?.length > 0 ? 'Editar Checklist' : 'Preencher Checklist'}
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-3xl p-10 border border-border text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">Nenhum serviço ativo</p>
              <p className="text-sm text-muted-foreground mt-1">O check-list fica disponível quando há um serviço em andamento</p>
            </div>
          )}
        </div>
      )}

      {/* ── ABA TERMOS ── */}
      {activeTab === 'termos' && (
        <ProviderTermsTab providerId={provider?.id} />
      )}

      {/* ── ABA HISTÓRICO ── */}
      {activeTab === 'historico' && (
        <div>
          {completedJobs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Total: {completedJobs.length} serviço(s) concluído(s)</p>
              {[...completedJobs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(job => (
                <div key={job.id} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{SERVICE_LABELS[job.service_type] || job.service_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.client_name} · {job.city}</p>
                    {job.created_date && (
                      <p className="text-xs text-muted-foreground">{new Date(job.created_date).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                  {job.final_price && <span className="text-sm font-bold text-primary">R$ {job.final_price}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-3xl p-10 border border-border text-center">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">Nenhum serviço concluído ainda</p>
            </div>
          )}
        </div>
      )}

      {/* ── ABA NOTAS FISCAIS ── */}
      {activeTab === 'notas' && (
        <InvoiceManager providerId={provider.id} providerName={provider.name} />
      )}

      {/* ── ABA INDISPONIBILIDADE ── */}
      {activeTab === 'indisponibilidade' && (
        <ProviderUnavailabilitySection providerId={provider.id} />
      )}

      {/* ── ABA CASHBACK/BÔNUS ── */}
      {activeTab === 'cashback' && (
        <CashbackPanel userId={provider.id} ownerType="prestador" />
      )}

      {/* ── ABA FOTOS ── */}
      {activeTab === 'fotos' && (
        <ProviderPhotoEditor
          provider={provider}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['my-provider'] })}
        />
      )}

      {/* ── ABA FUNDO DE RESERVA ── */}
      {activeTab === 'fundo' && (
        <ProviderReserveFund providerId={provider.id} />
      )}

      {/* Checklist modal */}
      {showChecklist && activeJob && (
        <ServiceChecklist job={activeJob} onClose={() => setShowChecklist(false)} />
      )}

      {/* Ponto adicional modal */}
      {showAdditionalPoint && activeJob && (
        <AdditionalPointModal job={activeJob} onClose={() => { setShowAdditionalPoint(false); queryClient.invalidateQueries({ queryKey: ['my-jobs'] }); }} />
      )}

      {/* Banner de novo chamado com alerta sonoro - só aparece quando não há job ativo */}
      <NewJobBanner
        job={shouldShowBanner ? incomingJob : null}
        queueCount={jobQueue.length}
        onAccept={handleAcceptBanner}
        onDecline={() => handleDeclineBanner(incomingJob)}
      />

      {/* Modal de motivo de recusa */}
      {declineTarget && (
        <DeclineReasonModal
          onConfirm={handleDeclineConfirm}
          onCancel={() => setDeclineTarget(null)}
        />
      )}
    </div>
  );
}