import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, Users, Briefcase, Star, TrendingUp, DollarSign, KeyRound, Eye, EyeOff, FileText, Activity } from "lucide-react";
import ServicePricing from '../components/admin/ServicePricing';
import ServicePricingByCategory from '../components/admin/ServicePricingByCategory';
import ProviderRepasse from '../components/admin/ProviderRepasse';
import Analytics from '../components/admin/Analytics';
import ScheduledServicesOptimizer from '../components/admin/ScheduledServicesOptimizer';
import ChecklistsAdmin from '../components/admin/ChecklistsAdmin';
import AdditionalPointsAdmin from '../components/admin/AdditionalPointsAdmin';
import ProviderPhotosApproval from '../components/admin/ProviderPhotosApproval';
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
import TermsManager from '../components/admin/TermsManager';
import ProviderTermsManager from '../components/admin/ProviderTermsManager';
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
  em_andamento: "Em andamento", concluido: "Concluído", cancelado: "Cancelado",
};

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const togglePassword = (reqId) => {
    setRevealedPasswords(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const cancelRequest = useMutation({
    mutationFn: (id) => base44.entities.ServiceRequest.update(id, { status: 'cancelado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-requests'] });
      toast.success("Atendimento cancelado.");
      setCancelConfirm(null);
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
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success(approved ? "Prestador aprovado!" : "Prestador reprovado");
    },
  });

  const rejectProvider = useMutation({
    mutationFn: ({ providerId, rejectReason }) => base44.entities.Provider.update(providerId, {
      is_rejected: true,
      rejection_reason: rejectReason,
      rejected_at: new Date().toISOString(),
      is_approved: false,
      is_archived: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success("Prestador reprovado e arquivado com sucesso");
      setSelectedProvider(null);
    },
  });

  const blockProvider = useMutation({
    mutationFn: ({ providerId, blockReason }) => base44.entities.Provider.update(providerId, {
      is_blocked: true,
      block_reason: blockReason,
      blocked_at: new Date().toISOString(),
      is_approved: false,
      is_archived: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success("Prestador bloqueado e arquivado com sucesso");
      setSelectedProvider(null);
    },
  });

  const stats = {
    total: requests.length,
    active: requests.filter(r => ['aguardando', 'aceito', 'a_caminho', 'em_andamento'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'concluido').length,
    providers_online: providers.filter(p => p.is_online).length,
    providers_approved: providers.filter(p => p.is_approved).length,
    revenue: requests.filter(r => r.final_price).reduce((acc, r) => acc + (r.final_price || 0), 0),
  };

  const pendingProviders = providers.filter(p => !p.is_approved && !p.is_blocked && !p.is_rejected);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Alerta visual de serviços vencendo */}
      <ExpiringServicesAlert />

      <h1 className="text-2xl font-bold text-foreground mb-6">Painel Administrativo</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, icon: Briefcase, color: "text-foreground" },
          { label: "Ativos", value: stats.active, icon: Clock, color: "text-yellow-600" },
          { label: "Concluídos", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
          { label: "Online", value: stats.providers_online, icon: Users, color: "text-primary" },
          { label: "Prestadores", value: stats.providers_approved, icon: Star, color: "text-blue-600" },
          { label: "Receita", value: `R$ ${Math.floor(stats.revenue)}`, icon: TrendingUp, color: "text-primary" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-2 text-center">
              <stat.icon className={cn("w-4 h-4 mx-auto mb-0.5", stat.color)} />
              <p className={cn("text-sm font-bold", stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingProviders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2 mb-2 text-xs">
          <p className="font-semibold text-yellow-800">⚠️ {pendingProviders.length} prestador(es) aguardando aprovação</p>
        </div>
      )}
      {pendingPhotoProviders.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 mb-3 text-xs">
          <p className="font-semibold text-orange-800">📷 {pendingPhotoProviders.length} fotos aguardando aprovação</p>
        </div>
      )}

      <Tabs defaultValue="analytics">
        <TabsList className="mb-3 flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="analytics" className="text-xs px-2 py-1">📊 Analytics</TabsTrigger>
          <TabsTrigger value="optimizer" className="text-xs px-2 py-1">🎯 Rotas</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs px-2 py-1">Chamados</TabsTrigger>
          <TabsTrigger value="providers" className="text-xs px-2 py-1">
            Prestadores {pendingProviders.length > 0 && `(${pendingProviders.length})`}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs px-2 py-1">
            <DollarSign className="w-3 h-3 mr-0.5" /> Preços
          </TabsTrigger>
          <TabsTrigger value="repasse" className="text-xs px-2 py-1">
            <DollarSign className="w-3 h-3 mr-0.5" /> Repasse
          </TabsTrigger>
          <TabsTrigger value="checklists" className="text-xs px-2 py-1">✅ Checklists</TabsTrigger>
          <TabsTrigger value="additional" className="text-xs px-2 py-1">➕ Pontos</TabsTrigger>
          <TabsTrigger value="photos" className="text-xs px-2 py-1">
            📷 {pendingPhotoProviders.length > 0 && `(${pendingPhotoProviders.length})`}
          </TabsTrigger>
          <TabsTrigger value="reserve-fund" className="text-xs px-2 py-1">
            🔐 Fundos
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs px-2 py-1">
            🧾 NFe
          </TabsTrigger>
          <TabsTrigger value="fechamento" className="text-xs px-2 py-1">
            📆 Fechamento
          </TabsTrigger>
          <TabsTrigger value="consulta-cliente" className="text-xs px-2 py-1">
            🔍 Clientes
          </TabsTrigger>
          <TabsTrigger value="metricas" className="text-xs px-2 py-1">
            <Activity className="w-3 h-3 mr-0.5" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="text-xs px-2 py-1">
            🚫 Blacklist
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs px-2 py-1">
            📄 Documentos
          </TabsTrigger>
          <TabsTrigger value="termos" className="text-xs px-2 py-1">
            📋 Termos Clientes
          </TabsTrigger>
          <TabsTrigger value="termos-prestador" className="text-xs px-2 py-1">
            📋 Termos Prestadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <Analytics />
        </TabsContent>

        <TabsContent value="optimizer">
          <ScheduledServicesOptimizer />
        </TabsContent>

        <TabsContent value="requests">
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
                        <Badge className={cn("text-xs border-0", STATUS_COLORS[req.status])}>{STATUS_LABELS[req.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        👤 {req.client_name} · 📍 {req.city || req.address}
                        {req.provider_name && ` · 🔧 ${req.provider_name}`}
                      </p>
                    </div>
                    {req.final_price && (
                      <span className="font-bold text-primary text-lg shrink-0">R$ {req.final_price}</span>
                    )}
                  </div>

                  {/* Senha de validação */}
                  {req.validation_password && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <KeyRound className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span className="text-xs text-amber-700 font-semibold flex-1">Senha de validação:</span>
                      <span className={cn("font-mono font-bold text-amber-900 tracking-widest text-sm", !revealedPasswords[req.id] && "blur-sm select-none")}>
                        {req.validation_password}
                      </span>
                      <button onClick={() => togglePassword(req.id)} className="p-1 hover:bg-amber-100 rounded-lg">
                        {revealedPasswords[req.id]
                          ? <EyeOff className="w-4 h-4 text-amber-700" />
                          : <Eye className="w-4 h-4 text-amber-700" />}
                      </button>
                    </div>
                  )}

                  {/* Cancelar atendimento */}
                  {!['cancelado', 'concluido'].includes(req.status) && (
                    cancelConfirm === req.id ? (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2">
                        <p className="text-xs text-red-700 font-semibold flex-1">Confirmar cancelamento?</p>
                        <Button size="sm" variant="outline" className="rounded-lg text-xs h-7 px-2" onClick={() => setCancelConfirm(null)}>Não</Button>
                        <Button size="sm" className="rounded-lg text-xs h-7 px-2 bg-destructive hover:bg-destructive/90 text-white" onClick={() => cancelRequest.mutate(req.id)} disabled={cancelRequest.isPending}>
                          Sim, cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 text-xs"
                        onClick={() => setCancelConfirm(req.id)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar atendimento
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="providers">
          <div className="space-y-3">
            {providers.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum prestador cadastrado</p>
            ) : providers.filter(p => !p.is_blocked && !p.is_rejected).map(prov => (
              <Card key={prov.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">{prov.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{prov.name}</p>
                        <p className="text-sm text-muted-foreground">{prov.city} · {prov.phone}</p>
                        <div className="flex gap-2 mt-1">
                          {prov.is_approved ? (
                            <Badge className="bg-green-100 text-green-800 border-0 text-xs">Aprovado</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">Pendente</Badge>
                          )}
                          {prov.is_online && <Badge className="bg-primary/10 text-primary border-0 text-xs">Online</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setSelectedProvider(prov)}>
                        <FileText className="w-4 h-4 mr-1" /> Ver ficha
                      </Button>
                      {!prov.is_approved && (
                        <>
                          <Button size="sm" className="rounded-xl bg-green-600 text-white hover:bg-green-700" onClick={() => approveProvider.mutate({ id: prov.id, approved: true })}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setSelectedProvider(prov)}>
                            <XCircle className="w-4 h-4 mr-1" /> Reprovar
                          </Button>
                        </>
                      )}
                      {prov.is_approved && (
                        <Button size="sm" variant="outline" className="rounded-xl text-destructive border-destructive/30" onClick={() => approveProvider.mutate({ id: prov.id, approved: false })}>
                          <XCircle className="w-4 h-4 mr-1" /> Bloquear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="space-y-4">
            <ServicePricing />
            <div className="border-t border-border pt-4 mt-4">
              <TowPricing />
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <ServicePricingByCategory />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="repasse">
          <ProviderRepasse />
        </TabsContent>

        <TabsContent value="checklists">
          <ChecklistsAdmin />
        </TabsContent>

        <TabsContent value="additional">
          <AdditionalPointsAdmin />
        </TabsContent>

        <TabsContent value="photos">
          <ProviderPhotosApproval />
        </TabsContent>

        <TabsContent value="reserve-fund">
          <AdminReserveFundDashboard />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesAdmin />
        </TabsContent>

        <TabsContent value="fechamento">
          <BiweeklyClosingAdmin />
        </TabsContent>

        <TabsContent value="consulta-cliente">
          <ClientConsultaAdmin />
        </TabsContent>

        <TabsContent value="metricas">
          <ServiceMetrics />
        </TabsContent>

        <TabsContent value="blacklist">
          <ClientBlacklist />
        </TabsContent>

        <TabsContent value="documentos">
          <ProviderDocumentReview />
        </TabsContent>

        <TabsContent value="termos">
          <TermsManager />
        </TabsContent>

        <TabsContent value="termos-prestador">
          <ProviderTermsManager />
        </TabsContent>
      </Tabs>

      {selectedProvider && (
        <ProviderDetailsModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onApprove={(id, approved) => approveProvider.mutate({ id, approved })}
          onReject={(id, reason) => rejectProvider.mutate({ providerId: id, rejectReason: reason })}
          onBlock={(id, reason) => blockProvider.mutate({ providerId: id, blockReason: reason })}
        />
      )}
    </div>
  );
}