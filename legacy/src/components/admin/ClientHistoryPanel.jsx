import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, MessageSquare, MapPin, ChevronDown, ChevronUp, X, Clock, Star } from 'lucide-react';
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  aguardando: "bg-yellow-100 text-yellow-800",
  aceito: "bg-blue-100 text-blue-800",
  a_caminho: "bg-blue-100 text-blue-800",
  em_andamento: "bg-purple-100 text-purple-800",
  em_espera: "bg-yellow-100 text-yellow-700",
  agendado: "bg-blue-100 text-blue-700",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  aguardando: "Aguardando", aceito: "Aceito", a_caminho: "A caminho",
  em_andamento: "Em andamento", em_espera: "Em espera", agendado: "Agendado",
  concluido: "Concluído", cancelado: "Cancelado",
};

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Cond.", limpeza_caixa_dagua: "Cx. d'Água",
  desentupimento: "Desentup.", troca_pneu: "Pneu", reboque: "Reboque",
  instalacao_suporte_tv: "Suporte TV", outros: "Outros",
};

const TICKET_TYPE_LABELS = {
  reclamacao: { label: 'Reclamação', color: 'bg-red-100 text-red-700' },
  elogio: { label: 'Elogio', color: 'bg-green-100 text-green-700' },
  sugestao: { label: 'Sugestão', color: 'bg-blue-100 text-blue-700' },
  duvida: { label: 'Dúvida', color: 'bg-orange-100 text-orange-700' },
};

const TICKET_STATUS_COLORS = {
  aberto: 'bg-yellow-100 text-yellow-800',
  em_atendimento: 'bg-blue-100 text-blue-800',
  resolvido: 'bg-green-100 text-green-800',
  fechado: 'bg-gray-100 text-gray-700',
};

export default function ClientHistoryPanel({ clientId, clientName, onClose }) {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('servicos');

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);

    Promise.all([
      base44.entities.ServiceRequest.filter({ client_id: clientId }, '-created_date', 50),
      base44.entities.Ticket.filter({ client_id: clientId }, '-created_date', 50),
    ]).then(([requests, tks]) => {
      setServiceRequests(requests);
      setTickets(tks);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [clientId]);

  const concluded = serviceRequests.filter(r => r.status === 'concluido').length;
  const cancelled = serviceRequests.filter(r => r.status === 'cancelado').length;
  const avgRating = serviceRequests.filter(r => r.rating_client).length > 0
    ? (serviceRequests.reduce((s, r) => s + (r.rating_client || 0), 0) / serviceRequests.filter(r => r.rating_client).length).toFixed(1)
    : null;

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 flex-shrink-0">
        <div>
          <p className="font-bold text-foreground text-sm">Histórico do Cliente</p>
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{clientName}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Stats resumo */}
          <div className="grid grid-cols-3 gap-2 p-3 border-b border-border flex-shrink-0">
            <div className="text-center">
              <p className="text-lg font-black text-foreground">{serviceRequests.length}</p>
              <p className="text-xs text-muted-foreground">Total OS</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-green-600">{concluded}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-primary">{avgRating ? avgRating : '—'}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                {avgRating && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />} Avaliação
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setActiveTab('servicos')}
              className={cn(
                "flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                activeTab === 'servicos'
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-3.5 h-3.5" /> OS ({serviceRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={cn(
                "flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                activeTab === 'tickets'
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Tickets ({tickets.length})
            </button>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'servicos' && (
              serviceRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhuma OS encontrada
                </div>
              ) : (
                serviceRequests.map(req => (
                  <div key={req.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {SERVICE_LABELS[req.service_type] || req.service_type}
                      </span>
                      <Badge className={cn("text-xs border-0 flex-shrink-0", STATUS_COLORS[req.status])}>
                        {STATUS_LABELS[req.status] || req.status}
                      </Badge>
                    </div>
                    {req.service_number && (
                      <p className="text-xs font-mono text-primary/70">{req.service_number}</p>
                    )}
                    {req.provider_name && (
                      <p className="text-xs text-muted-foreground">🔧 {req.provider_name}</p>
                    )}
                    {req.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {req.address}{req.city ? `, ${req.city}` : ''}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {req.created_date ? new Date(req.created_date).toLocaleDateString('pt-BR') : '—'}
                      </p>
                      {req.final_price && (
                        <span className="text-xs font-bold text-primary">R$ {Number(req.final_price).toLocaleString('pt-BR')}</span>
                      )}
                    </div>
                    {req.rating_client && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> {req.rating_client}/5
                        {req.rating_comment && <span className="text-muted-foreground italic truncate">· {req.rating_comment}</span>}
                      </p>
                    )}
                  </div>
                ))
              )
            )}

            {activeTab === 'tickets' && (
              tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum ticket anterior
                </div>
              ) : (
                tickets.map(tk => {
                  const typeConfig = TICKET_TYPE_LABELS[tk.type] || { label: tk.type, color: 'bg-gray-100 text-gray-700' };
                  const statusColor = TICKET_STATUS_COLORS[tk.status] || 'bg-gray-100 text-gray-700';
                  return (
                    <div key={tk.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={cn("text-xs border-0", typeConfig.color)}>{typeConfig.label}</Badge>
                        <Badge className={cn("text-xs border-0", statusColor)}>{tk.status}</Badge>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{tk.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{tk.message}</p>
                      {tk.response && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
                          <p className="text-xs text-primary font-semibold mb-0.5">Resposta:</p>
                          <p className="text-xs text-foreground line-clamp-2">{tk.response}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {tk.created_date ? new Date(tk.created_date).toLocaleDateString('pt-BR') : '—'}
                        </p>
                        {tk.attendant_name && (
                          <p className="text-xs text-muted-foreground">🎧 {tk.attendant_name}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}