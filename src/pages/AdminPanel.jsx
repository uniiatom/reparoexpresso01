import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Users, Briefcase, Star, TrendingUp, KeyRound, Eye, EyeOff, FileText, Activity, Zap } from "lucide-react";
import AdminCreateOrder from '../components/admin/AdminCreateOrder';
import ServicePricingByRegion from '../components/admin/ServicePricingByRegion';
import ServicePricingByCategory from '../components/admin/ServicePricingByCategory';
import ProviderRepasse from '../components/admin/ProviderRepasse';
import Analytics from '../components/admin/Analytics';
import ScheduledServicesOptimizer from '../components/admin/ScheduledServicesOptimizer';
import ChecklistsAdmin from '../components/admin/ChecklistsAdmin';
import AdditionalPointsAdmin from '../components/admin/AdditionalPointsAdmin';
import ProviderPhotosApproval from '../components/admin/ProviderPhotosApproval';
import AdminProvidersPanel from '../components/admin/AdminProvidersPanel';
import ProviderDetailsModal from '../components/admin/ProviderDetailsModal';
import AdminReserveFundDashboard from '../components/AdminReserveFundDashboard';
import InvoicesAdmin from '../components/admin/InvoicesAdmin';
import BiweeklyClosingAdmin from '../components/admin/BiweeklyClosingAdmin';
import ClientConsultaAdmin from '../components/admin/ClientConsultaAdmin';
import ServiceMetrics from '../components/admin/ServiceMetrics';
import ClientBlacklist from '../components/admin/ClientBlacklist';
import TowPricing from '../components/admin/TowPricing';
import ProviderDocumentReview from '../components/admin/ProviderDocumentReview';
import ExpiringServicesAlert from '../components/admin/ExpiringServicesAlert';
import ProviderTermsManager from '../components/admin/ProviderTermsManager';
import ClientTermsManager from '../components/admin/ClientTermsManager';
import TicketsAdmin from '../components/admin/TicketsAdmin';
import ScheduledCalendar from '../components/admin/ScheduledCalendar';
import ProviderSettings from '../components/admin/ProviderSettings';
import UndoProviderAction from '../components/admin/UndoProviderAction';
import ReembolsosRepasses from '../components/admin/ReembolsosRepasses';
import ActivityLog from '../components/admin/ActivityLog';
import CouponsAdmin from '../components/admin/CouponsAdmin';
import SurchargeRulesAdmin from '../components/admin/SurchargeRulesAdmin';
import CashbackConfigAdmin from '../components/admin/CashbackConfigAdmin';
import { logAdminAction } from '@/lib/adminLog';
import { useAuth } from '@/lib/AuthContext';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_COLORS = {
  aguardando: "bg-yellow-100 text-yellow-800",
  aceito: "bg-blue-100 text-blue-800",
  a_caminho: "bg-blue-100 text-blue-800",
  em_andamento: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  aguardando: "Aguardando", aceito: "Aceito", a_caminho: "A caminho",
  em_andamento: "Em andamento", concluido: "ConcluÃ­do", cancelado: "Cancelado",
};

const SERVICE_LABELS = {
  eletrica: "ElÃ©trica", hidraulica: "HidrÃ¡ulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  React.useEffect(() => {
    setAdminUser(authUser ?? null);
  }, [authUser]);

  if (authUser?.role === 'attendant') {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Central de suporte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Papel atendente: acesso apenas aos tickets (PRD Â§2.4).
          </p>
        </div>
        <TicketsAdmin />
      </div>
    );
  }

  const togglePassword = (reqId) => {
    setRevealedPasswords(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const cancelRequest = useMutation({
    mutationFn: (id) => base44.entities.ServiceRequest.update(id, { status: 'cancelado' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['all-requests'] });
      toast.success("Atendimento cancelado.");
      setCancelConfirm(null);
      const req = requests.find(r => r.id === id);
      logAdminAction({
        action: 'service_cancelled',
        actorName: adminUser?.full_name || 'Admin',
        actorEmail: adminUser?.email || '',
        entityType: 'ServiceRequest',
        entityId: id,
        entityLabel: req ? `${req.service_type} - ${req.client_name}` : id,
        oldValue: 'em_andamento',
        newValue: 'cancelado',
      });
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['all-requests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
    refetchInterval: 15000,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['all-providers'],
    queryFn: () => base44.entities.Provider.list(),
  });

  const pendingPhotoProviders = providers.filter(p => p.photos_pending_review);

  const approveProvider = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.Provider.update(id, { is_approved: approved }),
    onSuccess: (_, { id, approved, providerName }) => {
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success(approved ? "Prestador aprovado!" : "Prestador reprovado");
      logAdminAction({
        action: approved ? 'provider_approved' : 'provider_rejected',
        actorName: adminUser?.full_name || 'Admin',
        actorEmail: adminUser?.email || '',
        entityType: 'Provider',
        entityId: id,
        entityLabel: providerName || id,
        newValue: approved ? 'aprovado' : 'reprovado',
      });
    },
  });

  const rejectProvider = useMutation({
    mutationFn: ({ providerId, rejectReason, providerName }) => base44.entities.Provider.update(providerId, {
      is_rejected: true,
      rejection_reason: rejectReason,
      rejected_at: new Date().toISOString(),
      is_approved: false,
      is_archived: true,
    }),
    onSuccess: (_, { providerId, rejectReason, providerName }) => {
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success("Prestador reprovado e arquivado com sucesso");
      setSelectedProvider(null);
      logAdminAction({
        action: 'provider_rejected',
        actorName: adminUser?.full_name || 'Admin',
        actorEmail: adminUser?.email || '',
        entityType: 'Provider',
        entityId: providerId,
        entityLabel: providerName || providerId,
        newValue: 'reprovado',
        details: rejectReason,
      });
    },
  });

  const blockProvider = useMutation({
    mutationFn: ({ providerId, blockReason, providerName }) => base44.entities.Provider.update(providerId, {
      is_blocked: true,
      block_reason: blockReason,
      blocked_at: new Date().toISOString(),
      is_approved: false,
      is_archived: true,
    }),
    onSuccess: (_, { providerId, blockReason, providerName }) => {
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success("Prestador bloqueado e arquivado com sucesso");
      setSelectedProvider(null);
      logAdminAction({
        action: 'provider_blocked',
        actorName: adminUser?.full_name || 'Admin',
        actorEmail: adminUser?.email || '',
        entityType: 'Provider',
        entityId: providerId,
        entityLabel: providerName || providerId,
        newValue: 'bloqueado',
        details: blockReason,
      });
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients'],
    queryFn: async () => {
      try {
        return await base44.entities.Client.list();
      } catch (e) {
        console.warn('AdminPanel: Error fetching clients', e);
        return [];
      }
    },
    enabled: !!authUser,
  });

  const stats = {
    total: requests.length,
    active: requests.filter(r => ['aguardando', 'aceito', 'a_caminho', 'em_andamento'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'concluido').length,
    providers_online: providers.filter(p => p.is_online).length,
    providers_approved: providers.filter(p => p.is_approved).length,
    revenue: requests.filter(r => r.final_price).reduce((acc, r) => acc + (r.final_price || 0), 0),
    clients_total: clients.length,
    users_total: clients.length + providers.length,
  };

  const pendingProviders = providers.filter(p => !p.is_approved && !p.is_blocked && !p.is_rejected);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'analytics');

  React.useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    if (searchParams.get('tab') !== tab) {
      setSearchParams({ tab }, { replace: true });
    }
  };

  return (
    <>
      <div className="pr-4 py-6 min-h-screen">
        {/* Alerta de serviÃ§os vencendo */}
        <ExpiringServicesAlert />

        {/* â”€â”€ Header â”€â”€ */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Painel Administrativo</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/-/g, ' ')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs h-8"
              onClick={() => handleNavigate('novo-pedido')}
            >
              + Novo Pedido
            </Button>
            <span>{/* placeholder para manter o bloco fechado corretamente abaixo */}</span>
          </div>
        </div>

        {/* â”€â”€ KPIs â”€â”€ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
          {[
            { label: 'Chamados',   value: stats.total,              icon: Briefcase,  color: 'text-foreground'  },
            { label: 'Ativos',     value: stats.active,             icon: Clock,      color: 'text-amber-500'   },
            { label: 'ConcluÃ­dos', value: stats.completed,          icon: CheckCircle2,color:'text-green-500'   },
            { label: 'Clientes',   value: stats.clients_total,      icon: Users,      color: 'text-sky-500'     },
            { label: 'UsuÃ¡rios',   value: stats.users_total,        icon: Activity,   color: 'text-purple-500'  },
            { label: 'Online',     value: stats.providers_online,   icon: Zap,        color: 'text-amber-500'   },
            { label: 'Aprovados',  value: stats.providers_approved, icon: Star,       color: 'text-blue-400'    },
            { label: 'Receita',    value: `R$ ${Math.floor(stats.revenue)}`, icon: TrendingUp, color: 'text-primary' },
          ].map(s => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-2 text-center">
                <s.icon className={cn('w-3.5 h-3.5 mx-auto mb-0.5', s.color)} />
                <p className={cn('text-sm font-bold leading-none', s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* â”€â”€ Alertas â”€â”€ */}
        {pendingProviders.length > 0 && (
          <button
            onClick={() => handleNavigate('providers')}
            className="w-full text-left bg-amber-500/8 border border-amber-500/20 rounded-xl p-2 mb-2 text-xs hover:bg-amber-500/12 transition-colors"
          >
            <span className="font-semibold text-amber-400">
              âš ï¸ {pendingProviders.length} prestador{pendingProviders.length > 1 ? 'es' : ''} aguardando aprovaÃ§Ã£o
            </span>
            <span className="text-amber-500/60 ml-2">â†’ Ver prestadores</span>
          </button>
        )}
        {pendingPhotoProviders.length > 0 && (
          <button
            onClick={() => handleNavigate('photos')}
            className="w-full text-left bg-orange-500/8 border border-orange-500/20 rounded-xl p-2 mb-4 text-xs hover:bg-orange-500/12 transition-colors"
          >
            <span className="font-semibold text-orange-400">
              ðŸ“· {pendingPhotoProviders.length} foto{pendingPhotoProviders.length > 1 ? 's' : ''} aguardando aprovaÃ§Ã£o
            </span>
            <span className="text-orange-500/60 ml-2">â†’ Ver fotos</span>
          </button>
        )}

        {/* â”€â”€ SeÃ§Ãµes de conteÃºdo â”€â”€ */}
        <div className="mt-2">
          {activeTab === 'analytics'       && <Analytics />}
          {activeTab === 'metricas'        && <ServiceMetrics />}
          {activeTab === 'novo-pedido'     && <AdminCreateOrder />}
          {activeTab === 'calendario'      && <ScheduledCalendar />}
          {activeTab === 'optimizer'       && <ScheduledServicesOptimizer />}
          {activeTab === 'consulta-cliente'&& <ClientConsultaAdmin />}
          {activeTab === 'photos'          && <ProviderPhotosApproval />}
          {activeTab === 'documentos'      && <ProviderDocumentReview />}
          {activeTab === 'blacklist'       && <ClientBlacklist />}
          {activeTab === 'pricing'         && (
            <div className="space-y-4">
              <ServicePricingByRegion />
              <div className="border-t border-border pt-4"><TowPricing /></div>
              <div className="border-t border-border pt-4"><ServicePricingByCategory /></div>
            </div>
          )}
          {activeTab === 'repasse'         && <ProviderRepasse />}
          {activeTab === 'fechamento'      && <BiweeklyClosingAdmin />}
          {activeTab === 'invoices'        && <InvoicesAdmin />}
          {activeTab === 'reserve-fund'    && <AdminReserveFundDashboard />}
          {activeTab === 'reembolsos'      && <ReembolsosRepasses />}
          {activeTab === 'cashback-config' && <CashbackConfigAdmin />}
          {activeTab === 'coupons'         && <CouponsAdmin />}
          {activeTab === 'sobretaxas'      && <SurchargeRulesAdmin />}
          {activeTab === 'checklists'      && <ChecklistsAdmin />}
          {activeTab === 'additional'      && <AdditionalPointsAdmin />}
          {activeTab === 'termos'          && <ClientTermsManager />}
          {activeTab === 'termos-prestador'&& <ProviderTermsManager />}
          {activeTab === 'tickets'         && <TicketsAdmin />}
          {activeTab === 'logs'            && <ActivityLog />}
          {activeTab === 'provider-settings' && <ProviderSettings />}

          {/* â”€â”€ Chamados (inline) â”€â”€ */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum chamado ainda</p>
              ) : requests.map(req => (
                <Card key={req.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{SERVICE_LABELS[req.service_type] || req.service_type}</span>
                          {req.service_number && <span className="text-xs font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded">{req.service_number}</span>}
                          <Badge className={cn('text-xs border-0', STATUS_COLORS[req.status])}>{STATUS_LABELS[req.status]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ðŸ‘¤ {req.client_name} Â· ðŸ“ {req.city || req.address}
                          {req.provider_name && ` Â· ðŸ”§ ${req.provider_name}`}
                        </p>
                      </div>
                      {req.final_price && (
                        <span className="font-bold text-primary text-lg shrink-0">R$ {req.final_price}</span>
                      )}
                    </div>
                    {req.validation_password && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <KeyRound className="w-4 h-4 text-amber-700 flex-shrink-0" />
                        <span className="text-xs text-amber-700 font-semibold flex-1">Senha de validaÃ§Ã£o:</span>
                        <span className={cn('font-mono font-bold text-amber-900 tracking-widest text-sm', !revealedPasswords[req.id] && 'blur-sm select-none')}>
                          {req.validation_password}
                        </span>
                        <button onClick={() => togglePassword(req.id)} className="p-1 hover:bg-amber-100 rounded-lg">
                          {revealedPasswords[req.id]
                            ? <EyeOff className="w-4 h-4 text-amber-700" />
                            : <Eye    className="w-4 h-4 text-amber-700" />}
                        </button>
                      </div>
                    )}
                    {!['cancelado', 'concluido', 'aguardando'].includes(req.status) && (
                      <UndoProviderAction request={req} adminUser={adminUser} />
                    )}
                    {!['cancelado', 'concluido'].includes(req.status) && (
                      cancelConfirm === req.id ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2">
                          <p className="text-xs text-red-700 font-semibold flex-1">Confirmar cancelamento?</p>
                          <Button size="sm" variant="outline" className="rounded-lg text-xs h-7 px-2" onClick={() => setCancelConfirm(null)}>NÃ£o</Button>
                          <Button size="sm" className="rounded-lg text-xs h-7 px-2 bg-destructive hover:bg-destructive/90 text-white"
                            onClick={() => cancelRequest.mutate(req.id)} disabled={cancelRequest.isPending}>
                            Sim, cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline"
                          className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 text-xs"
                          onClick={() => setCancelConfirm(req.id)}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar atendimento
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* â”€â”€ Prestadores (inline) â”€â”€ */}
          {activeTab === 'providers' && (
            <AdminProvidersPanel
              providers={providers}
              adminUser={adminUser}
              onSelectProvider={setSelectedProvider}
              onApprove={(id, name) => approveProvider.mutate({ id, approved: true, providerName: name })}
              onBlock={(id, name) => approveProvider.mutate({ id, approved: false, providerName: name })}
            />

          )}
        </div>{/* fim seÃ§Ãµes */}
      </div>{/* fim pl-14 */}

      {/* Modal de detalhes do prestador */}
      {selectedProvider && (
        <ProviderDetailsModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onApprove={(id, name) => approveProvider.mutate({ id, approved: true, providerName: name })}
          onReject={({ providerId, rejectReason, providerName }) =>
            rejectProvider.mutate({ providerId, rejectReason, providerName })}
          onBlock={({ providerId, blockReason, providerName }) =>
            blockProvider.mutate({ providerId, blockReason, providerName })}
        />
      )}
    </>
  );
}
