import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, Users, Briefcase, Star, TrendingUp, DollarSign } from "lucide-react";
import ServicePricing from '../components/admin/ServicePricing';
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

  const { data: requests = [] } = useQuery({
    queryKey: ['all-requests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
    refetchInterval: 15000,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['all-providers'],
    queryFn: () => base44.entities.Provider.list(),
  });

  const approveProvider = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.Provider.update(id, { is_approved: approved }),
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success(approved ? "Prestador aprovado!" : "Prestador bloqueado");
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

  const pendingProviders = providers.filter(p => !p.is_approved);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Painel Administrativo</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Total Chamados", value: stats.total, icon: Briefcase, color: "text-foreground" },
          { label: "Ativos", value: stats.active, icon: Clock, color: "text-yellow-600" },
          { label: "Concluídos", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
          { label: "Online agora", value: stats.providers_online, icon: Users, color: "text-primary" },
          { label: "Prestadores", value: stats.providers_approved, icon: Star, color: "text-blue-600" },
          { label: "Receita", value: `R$ ${stats.revenue.toFixed(0)}`, icon: TrendingUp, color: "text-primary" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
              <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingProviders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
          <p className="font-semibold text-yellow-800 text-sm">⚠️ {pendingProviders.length} prestador(es) aguardando aprovação</p>
        </div>
      )}

      <Tabs defaultValue="requests">
        <TabsList className="mb-6">
          <TabsTrigger value="requests">Chamados</TabsTrigger>
          <TabsTrigger value="providers">
            Prestadores {pendingProviders.length > 0 && `(${pendingProviders.length} pendentes)`}
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="w-3.5 h-3.5 mr-1" /> Precificação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum chamado ainda</p>
            ) : requests.map(req => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{SERVICE_LABELS[req.service_type]}</span>
                        <Badge className={cn("text-xs border-0", STATUS_COLORS[req.status])}>{STATUS_LABELS[req.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        👤 {req.client_name} · 📍 {req.city || req.address}
                        {req.provider_name && ` · 🔧 ${req.provider_name}`}
                      </p>
                    </div>
                    {req.final_price && (
                      <span className="font-bold text-primary text-lg">R$ {req.final_price}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="providers">
          <div className="space-y-3">
            {providers.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum prestador cadastrado</p>
            ) : providers.map(prov => (
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
                    <div className="flex gap-2">
                      {!prov.is_approved && (
                        <Button size="sm" className="rounded-xl bg-green-600 text-white hover:bg-green-700" onClick={() => approveProvider.mutate({ id: prov.id, approved: true })}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                        </Button>
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
      </Tabs>
    </div>
  );
}