import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, AlertCircle, HelpCircle, Plus, X, ChevronDown, ChevronUp, User, ArrowLeft } from 'lucide-react';
import { toast } from "sonner";

const TICKET_TYPES = [
  { value: 'reclamacao', label: 'Reclamação', icon: AlertCircle, color: 'text-red-500 bg-red-50 border-red-200' },
  { value: 'elogio', label: 'Elogio', icon: ThumbsUp, color: 'text-green-500 bg-green-50 border-green-200' },
  { value: 'sugestao', label: 'Sugestão', icon: MessageSquare, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { value: 'duvida', label: 'Dúvida', icon: HelpCircle, color: 'text-orange-500 bg-orange-50 border-orange-200' },
];

const STATUS_CONFIG = {
  aberto: { label: 'Aberto', color: 'bg-yellow-100 text-yellow-800' },
  em_atendimento: { label: 'Em atendimento', color: 'bg-blue-100 text-blue-800' },
  resolvido: { label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  fechado: { label: 'Fechado', color: 'bg-gray-100 text-gray-800' },
};

export default function ClientTicketForm({ clientId, clientName, clientEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null); // { provider_id, provider_name, service_request_id }
  const [form, setForm] = useState({ type: '', subject: '', message: '' });
  const queryClient = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', clientId],
    queryFn: () => base44.entities.Ticket.filter({ client_id: clientId }, '-created_date'),
    enabled: !!clientId,
  });

  // Busca últimos 10 serviços concluídos com prestador
  const { data: recentServices = [] } = useQuery({
    queryKey: ['client-recent-providers', clientId],
    queryFn: async () => {
      const all = await base44.entities.ServiceRequest.filter(
        { client_id: clientId, status: 'concluido' },
        '-created_date',
        30
      );
      // Deduplica por provider_id, mantém o mais recente
      const seen = new Set();
      const unique = [];
      for (const s of all) {
        if (s.provider_id && !seen.has(s.provider_id)) {
          seen.add(s.provider_id);
          unique.push(s);
          if (unique.length >= 10) break;
        }
      }
      // Busca fotos dos prestadores
      if (unique.length === 0) return [];
      const providerIds = unique.map(s => s.provider_id);
      const providers = await base44.entities.Provider.list('-created_date', 200);
      const provMap = {};
      providers.forEach(p => { provMap[p.id] = p; });
      return unique.map(s => ({
        service_request_id: s.id,
        provider_id: s.provider_id,
        provider_name: s.provider_name || 'Prestador',
        provider_photo: provMap[s.provider_id]?.photo_url || null,
        service_type: s.service_type,
        created_date: s.created_date,
      }));
    },
    enabled: !!clientId,
  });

  const createTicket = useMutation({
    mutationFn: (data) => base44.entities.Ticket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets', clientId] });
      toast.success('Ticket enviado com sucesso! Em breve entraremos em contato.');
      setShowForm(false);
      setForm({ type: '', subject: '', message: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.type || !form.subject || !form.message) {
      toast.error('Preencha todos os campos');
      return;
    }
    createTicket.mutate({
      ...form,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      service_request_id: selectedProvider?.service_request_id || '',
      status: 'aberto',
    });
  };

  const handleProviderClick = (prov) => {
    setSelectedProvider(prov);
    // Pré-preenche assunto com nome do prestador
    setForm(f => ({
      ...f,
      subject: f.subject || `Sobre o atendimento de ${prov.provider_name}`,
    }));
    setShowForm(true);
  };

  const handleOpenFormGeneral = () => {
    setSelectedProvider(null);
    setShowForm(true);
  };

  const openTickets = tickets.filter(t => t.status !== 'fechado' && t.status !== 'resolvido');

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          💬 Fale Conosco
        </h3>
        {openTickets.length > 0 && (
          <Badge className="bg-primary/10 text-primary border-0">
            {openTickets.length} aberto(s)
          </Badge>
        )}
      </div>

      {!showForm ? (
        <div className="space-y-4">
          {/* Últimos prestadores */}
          {recentServices.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Clique no prestador para abrir uma tratativa
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {recentServices.map(prov => (
                  <button
                    key={prov.provider_id}
                    onClick={() => handleProviderClick(prov)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                  >
                    <div className="relative">
                      {prov.provider_photo ? (
                        <img
                          src={prov.provider_photo}
                          alt={prov.provider_name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-border group-hover:border-primary transition-all shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-border group-hover:border-primary transition-all flex items-center justify-center">
                          <User className="w-7 h-7 text-primary/60" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <MessageSquare className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <span className="text-xs text-foreground font-medium w-16 text-center truncate leading-tight">
                      {prov.provider_name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleOpenFormGeneral}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl hover:from-primary/10 hover:to-primary/15 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Abrir reclamação ou elogio</p>
              <p className="text-xs text-muted-foreground">Fale sobre um serviço ou experiência</p>
            </div>
          </button>

          {tickets.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition text-sm text-muted-foreground"
            >
              <span>Meus tickets ({tickets.length})</span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {showHistory && (
            <div className="space-y-2">
              {tickets.map(ticket => {
                const typeConfig = TICKET_TYPES.find(t => t.value === ticket.type);
                const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.aberto;
                const Icon = typeConfig?.icon || MessageSquare;
                return (
                  <Card key={ticket.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${typeConfig?.color.split(' ')[0]}`} />
                          <span className="font-semibold text-sm text-foreground">{ticket.subject}</span>
                        </div>
                        <Badge className={`text-xs border-0 ${statusConfig.color}`}>{statusConfig.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.message}</p>
                      {ticket.response && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mt-2">
                          <p className="text-xs font-semibold text-primary mb-1">Resposta do suporte:</p>
                          <p className="text-xs text-foreground">{ticket.response}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(ticket.created_date).toLocaleDateString('pt-BR')}
                        {ticket.attendant_name && ` · Atendente: ${ticket.attendant_name}`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Novo Ticket</CardTitle>
              <button onClick={() => { setShowForm(false); setSelectedProvider(null); setForm({ type: '', subject: '', message: '' }); }} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Prestador selecionado */}
              {selectedProvider && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-2xl">
                  {selectedProvider.provider_photo ? (
                    <img src={selectedProvider.provider_photo} alt={selectedProvider.provider_name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Sobre o atendimento de</p>
                    <p className="text-sm font-bold text-foreground truncate">{selectedProvider.provider_name}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedProvider(null)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TICKET_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: type.value }))}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          form.type === type.value
                            ? type.color + ' border-current'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assunto */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Assunto *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Ex: Problema com o serviço de elétrica"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Mensagem *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Descreva detalhadamente o que aconteceu..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowForm(false); setSelectedProvider(null); setForm({ type: '', subject: '', message: '' }); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={createTicket.isPending}>
                  {createTicket.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}