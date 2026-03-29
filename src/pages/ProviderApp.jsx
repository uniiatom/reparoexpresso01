import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Clock, CheckCircle2, Wrench, Star, BellRing, X, Check, ClipboardList, Calendar, CalendarOff } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState('chamados');
  const [declineTarget, setDeclineTarget] = useState(null); // { job, source: 'banner' | 'list' }

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

  const { data: requests = [] } = useQuery({
    queryKey: ['available-requests'],
    queryFn: async () => {
      const all = await base44.entities.ServiceRequest.filter({ status: 'aguardando' });
      // Exclui OS já atribuídas a este prestador (essas aparecem na fila de OS)
      return all.filter(r => !r.provider_id || r.provider_id !== provider?.id);
    },
    refetchInterval: 8000,
    enabled: !!provider?.is_online && !!provider?.is_approved,
  });

  const [myJobs, setMyJobs] = useState([]);
  const activeJob = myJobs.find(j => ['aceito', 'a_caminho', 'em_andamento'].includes(j.status));

  // Job atual no banner = primeiro da fila
  const incomingJob = jobQueue[0] || null;

  useNewJobAlert({
    enabled: !!(provider?.is_online && provider?.is_approved && !activeJob),
    onNewJob: handleNewJob,
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!provider?.id) return;
    // Carga inicial
    base44.entities.ServiceRequest.filter({ provider_id: provider.id }).then(setMyJobs);
    // Real-time via subscribe
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (!['create', 'update', 'delete'].includes(event.type)) return;
      if (event.data?.provider_id !== provider.id && event.type !== 'delete') return;
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

      // Captura GPS atual do prestador para calcular tempo real de chegada
      const calcDist = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      };
      const distToMins = (distKm) => distKm < 0.2 ? 1 : Math.max(1, Math.round((distKm / 30) * 60));

      await new Promise((resolve) => {
        const fallback = () => {
          // Sem GPS: usa localização salva do prestador vs localização do pedido
          const pLat = provider?.latitude;
          const pLon = provider?.longitude;
          resolve({ pLat, pLon });
        };

        if (!navigator.geolocation) { fallback(); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ pLat: pos.coords.latitude, pLon: pos.coords.longitude }),
          fallback,
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }).then(async ({ pLat, pLon }) => {
        if (pLat && pLon) {
          updateData.provider_latitude = pLat;
          updateData.provider_longitude = pLon;
        }
        try {
          const [req] = await base44.entities.ServiceRequest.filter({ id: reqId });
          const clientLat = req?.client_latitude || req?.latitude;
          const clientLon = req?.client_longitude || req?.longitude;
          const dist = calcDist(pLat, pLon, clientLat, clientLon);
          // Sempre salva o estimated_arrival_minutes — nunca deixa o valor antigo (30 min)
          updateData.estimated_arrival_minutes = dist != null ? distToMins(dist) : 5;
        } catch(e) {
          updateData.estimated_arrival_minutes = 5;
        }
      });

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
    window.__clearSeenJobIds?.();
    setJobQueue([]);
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

    if (source === 'banner') {
      setJobQueue(prev => prev.filter(j => j.id !== job?.id));
    }

    // Salva o motivo e reseta o status para aguardando (recusa efetiva)
    const updateData = { status: 'aguardando', provider_id: null, provider_name: null, provider_phone: null };
    if (reason) updateData.decline_reason = reason;
    base44.entities.ServiceRequest.update(job.id, updateData).then(() => {
      queryClient.invalidateQueries({ queryKey: ['available-requests'] });
    });

    toast.info(reason ? `Chamado recusado: ${reason}` : "Chamado recusado.");
    setDeclineTarget(null);
  };

  const updateJobStatus = useMutation({
    mutationFn: ({ id, status, final_price }) => base44.entities.ServiceRequest.update(id, { status, ...(final_price && { final_price }) }),
  });

  const shouldShowBanner = !activeJob;
  const completedJobs = myJobs.filter(j => j.status === 'concluido');
  // OS na fila: atribuídas ao prestador mas ainda aguardando (não ativas nem concluídas nem agendadas)
  const queuedJobs = myJobs.filter(j => j.status === 'aguardando');
  // Serviços agendados — ordenados por data
  const scheduledJobs = myJobs
    .filter(j => j.status === 'agendado')
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));

  // Para a buzina automaticamente se o prestador já tem um job ativo
  useEffect(() => {
    if (activeJob) {
      window.__stopProviderHorn?.();
    }
  }, [activeJob?.id]);

  if (!provider) {
    return <ProviderSetupModal user={user} onCreated={() => queryClient.invalidateQueries({ queryKey: ['my-provider'] })} />;
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Olá, {provider.name.split(' ')[0]}!</h1>
          <div className="flex gap-1 mt-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={cn("w-3.5 h-3.5", s <= Math.round(provider.rating || 5) ? "text-yellow-400 fill-yellow-400" : "text-muted")} />
            ))}
            <span className="text-xs text-muted-foreground ml-1">{provider.total_jobs || 0} serviços</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Abas de navegação */}
      <div className="flex gap-1 mb-5 bg-muted rounded-2xl p-1">
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
          ✅ Check-list
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'historico' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          📋 Histórico
        </button>
        <button
          onClick={() => setActiveTab('indisponibilidade')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'indisponibilidade' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          🚫 Folgas
        </button>
      </div>

      {/* ── ABA CHAMADOS ── */}
      {activeTab === 'chamados' && <>

      {/* Job ativo */}
      {activeJob && (
        <ActiveJobCard
          job={activeJob}
          providerName={provider.name}
          onUpdateStatus={updateJobStatus.mutate}
          onShowChecklist={() => setShowChecklist(true)}
          onShowAdditionalPoint={() => setShowAdditionalPoint(true)}
          isPending={updateJobStatus.isPending}
        />
      )}

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
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-bold text-foreground text-sm">{SERVICE_LABELS[job.service_type] || job.service_type}</span>
                      {idx === 0 && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Próxima</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{job.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.address}{job.city ? `, ${job.city}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {job.client_name} · {job.client_phone}
                    </p>
                    <div className="flex gap-2 mt-3">
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
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-foreground">{SERVICE_LABELS[req.service_type]}</span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">{URGENCY_LABELS[req.urgency]}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{req.description}</p>
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
        <div>
          <p className="text-sm text-muted-foreground mb-4">
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
                    <Button
                      size="sm"
                      className="w-full mt-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                      onClick={() => {
                        window.__stopProviderHorn?.();
                        setJobQueue(prev => prev.filter(j => j.id !== job.id));
                        acceptJob.mutate(job.id);
                      }}
                      disabled={acceptJob.isPending}
                    >
                      <Check className="w-3 h-3 mr-1" /> Confirmar presença e iniciar
                    </Button>
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

      {/* ── ABA HISTÓRICO ── */}
      {activeTab === 'historico' && (
        <div>
          {completedJobs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Total: {completedJobs.length} serviço(s) concluído(s)</p>
              {completedJobs.map(job => (
                <div key={job.id} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{SERVICE_LABELS[job.service_type] || job.service_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.client_name} · {job.city}</p>
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

      {/* ── ABA INDISPONIBILIDADE ── */}
      {activeTab === 'indisponibilidade' && (
        <ProviderUnavailabilitySection providerId={provider.id} />
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