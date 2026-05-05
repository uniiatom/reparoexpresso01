import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin, Calendar, DollarSign, Star, Clock, CheckCircle2, AlertCircle, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  aguardando: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  aceito: { label: "Aceito", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  a_caminho: { label: "A caminho", color: "bg-purple-100 text-purple-800", icon: AlertCircle },
  em_andamento: { label: "Em andamento", color: "bg-indigo-100 text-indigo-800", icon: Loader2 },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: AlertCircle },
};

const SERVICE_LABELS = {
  eletrica: "Elétrica",
  hidraulica: "Hidráulica",
  pintura: "Pintura",
  montagem: "Montagem",
  reparo_geral: "Reparo Geral",
  alvenaria: "Alvenaria",
  fechadura: "Fechadura",
  ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água",
  limpeza_calha: "Limpeza de Calha",
  substituicao_telha: "Substituição de Telha",
  limpeza_telhado: "Limpeza de Telhado",
  instalacao_coifa_parede: "Coifa de Parede",
  instalacao_coifa_ilha: "Coifa Ilha",
  conversao_vaso_coplado: "Conversão Vaso CX Acoplada",
  instalacao_vaso_monobloco: "Vaso Monobloco",
  reparo_forro_gesso: "Reparo Forro de Gesso",
  desentupimento: "Desentupimento",
  troca_pneu: "Troca de Pneu",
  recarga_bateria: "Recarga de Bateria",
  conserto_pneu: "Conserto de Pneu",
  reboque: "Reboque",
  outros: "Outros",
};

export default function MeusPedidos() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('new');

  React.useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => navigate('/'));
  }, [navigate]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['meus-pedidos', user?.email],
    queryFn: () => user?.email ? base44.entities.ServiceRequest.filter({ created_by: user.email }, '-created_date', 100) : [],
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeRequests = requests.filter(r => !['concluido', 'cancelado'].includes(r.status));
  const completedRequests = requests.filter(r => ['concluido', 'cancelado'].includes(r.status));

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Meus Pedidos</h1>
        <p className="text-muted-foreground text-sm">Solicite, acompanhe e gerencie seus serviços</p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('new')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'new'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Novo Serviço
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors relative",
            activeTab === 'active'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Ativos
          {activeRequests.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-primary text-primary-foreground rounded-full">
              {activeRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors relative",
            activeTab === 'history'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Histórico
          {completedRequests.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-muted text-muted-foreground rounded-full">
              {completedRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Novo Serviço */}
      {activeTab === 'new' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Solicitar um Novo Serviço</h3>
            <p className="text-sm text-muted-foreground">Clique abaixo para solicitar um serviço em sua casa</p>
            <Button 
              onClick={() => navigate('/solicitar')}
              className="w-full mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Solicitar Serviço
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Serviços Ativos */}
      {activeTab === 'active' && (
        <div className="space-y-3">
          {activeRequests.length > 0 ? (
            <div className="space-y-3">
              {activeRequests.map(req => {
                const statusConfig = STATUS_CONFIG[req.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <Card key={req.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <button
                        onClick={() => navigate(`/acompanhar/${req.id}`)}
                        className="w-full text-left space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{SERVICE_LABELS[req.service_type] || req.service_type}</p>
                            <p className="text-xs text-muted-foreground mt-1">{req.description?.substring(0, 60)}...</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge className={cn("text-xs border-0", statusConfig.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {req.final_price && (
                            <p className="font-semibold text-primary">R$ {req.final_price.toFixed(2)}</p>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          {req.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {req.city || req.address}
                            </span>
                          )}
                          {req.scheduled_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {req.scheduled_date}
                            </span>
                          )}
                        </div>
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Nenhum serviço em andamento</p>
            </div>
          )}
          </div>
          )}

          {/* Tab: Histórico (Serviços Executados) */}
          {activeTab === 'history' && (
          <div className="space-y-3">
          {completedRequests.length > 0 ? (
           <div className="space-y-3">
             {completedRequests.map(req => {
               const statusConfig = STATUS_CONFIG[req.status];
               const StatusIcon = statusConfig.icon;
               return (
                 <Card key={req.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                   <CardContent className="p-4">
                     <button
                       onClick={() => navigate(`/acompanhar/${req.id}`)}
                       className="w-full text-left space-y-3"
                     >
                       <div className="flex items-start justify-between gap-3">
                         <div>
                           <p className="font-semibold text-foreground">{SERVICE_LABELS[req.service_type] || req.service_type}</p>
                           <p className="text-xs text-muted-foreground mt-1">{req.description?.substring(0, 60)}...</p>
                         </div>
                         <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                       </div>

                       <div className="flex items-center justify-between">
                         <Badge className={cn("text-xs border-0", statusConfig.color)}>
                           <StatusIcon className="w-3 h-3 mr-1" />
                           {statusConfig.label}
                         </Badge>
                         {req.final_price && (
                           <p className="font-semibold text-primary">R$ {req.final_price.toFixed(2)}</p>
                         )}
                       </div>

                       {req.rating_client && (
                         <div className="flex items-center gap-2 text-xs">
                           <span className="flex items-center gap-1 text-yellow-600">
                             <Star className="w-3 h-3 fill-current" />
                             {req.rating_client.toFixed(1)}
                           </span>
                           {req.rating_comment && (
                             <span className="text-muted-foreground">"{req.rating_comment.substring(0, 30)}..."</span>
                           )}
                         </div>
                       )}
                     </button>
                   </CardContent>
                 </Card>
               );
             })}
           </div>
          ) : (
           <div className="text-center py-8">
             <p className="text-muted-foreground text-sm">Nenhum serviço finalizado</p>
           </div>
          )}
          </div>
          )}
    </div>
  );
}