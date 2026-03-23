import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Clock, CheckCircle2, Wrench, Star, BellRing, X, Check, ClipboardList } from "lucide-react";
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

  // Job atual no banner = primeiro da fila
  const incomingJob = jobQueue[0] || null;

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

  useNewJobAlert({
    enabled: !!(provider?.is_online && provider?.is_approved),
    onNewJob: handleNewJob,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['available-requests'],
    queryFn: () => base44.entities.ServiceRequest.filter({ status: 'aguardando' }),
    refetchInterval: 8000,
    enabled: !!provider?.is_online && !!provider?.is_approved,
  });

  const { data: myJobs = [] } = useQuery({
    queryKey: ['my-jobs', provider?.id],
    queryFn: () => base44.entities.ServiceRequest.filter({ provider_id: provider.id }),
    enabled: !!provider?.id,
    refetchInterval: 10000,
  });

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
    mutationFn: (reqId) => base44.entities.ServiceRequest.update(reqId, {
      status: 'aceito',
      provider_id: provider?.id,
      provider_name: provider?.name,
      provider_phone: provider?.phone,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success("Chamado aceito! Vá até o cliente.");
    },
  });

  const handleAcceptBanner = (job) => {
    window.__stopProviderHorn?.();
    setJobQueue(prev => prev.filter(j => j.id !== job.id));
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
      setJobQueue(prev => {
        const next = prev.filter(j => j.id !== job?.id);
        if (next.length > 0) {
          setTimeout(() => {
            window.__stopProviderHorn?.();
            import('../hooks/useNewJobAlert').then(m => {
              const stop = m.startHornLoop();
              window.__stopProviderHorn = stop;
            });
          }, 500);
        }
        return next;
      });
    }
    if (reason) {
      base44.entities.ServiceRequest.update(job.id, { decline_reason: reason }).catch(() => {});
    }
    toast.info(reason ? `Chamado recusado: ${reason}` : "Chamado recusado.");
    setDeclineTarget(null);
  };

  const updateJobStatus = useMutation({
    mutationFn: ({ id, status, final_price }) => base44.entities.ServiceRequest.update(id, { status, ...(final_price && { final_price }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-jobs'] }),
  });

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

  const activeJob = myJobs.find(j => ['aceito', 'a_caminho', 'em_andamento'].includes(j.status));
  const completedJobs = myJobs.filter(j => j.status === 'concluido');

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
      <div className="flex gap-2 mb-5 bg-muted rounded-2xl p-1">
        <button
          onClick={() => setActiveTab('chamados')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'chamados' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          🔔 Chamados
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'checklist' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          ✅ Check-list
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'historico' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          📋 Histórico
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
                      onClick={() => toast.info("Chamado ignorado.")}
                    >
                      <X className="w-4 h-4 mr-1" /> Recusar
                    </Button>
                    <Button
                      className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold"
                      onClick={() => acceptJob.mutate(req.id)}
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

      {/* Checklist modal */}
      {showChecklist && activeJob && (
        <ServiceChecklist job={activeJob} onClose={() => setShowChecklist(false)} />
      )}

      {/* Ponto adicional modal */}
      {showAdditionalPoint && activeJob && (
        <AdditionalPointModal job={activeJob} onClose={() => { setShowAdditionalPoint(false); queryClient.invalidateQueries({ queryKey: ['my-jobs'] }); }} />
      )}

      {/* Banner de novo chamado com alerta sonoro */}
      <NewJobBanner
        job={incomingJob}
        onAccept={handleAcceptBanner}
        onDecline={() => handleDeclineBanner(incomingJob)}
      />
    </div>
  );
}