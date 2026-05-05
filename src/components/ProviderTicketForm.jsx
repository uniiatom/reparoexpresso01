import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, HelpCircle, Plus, X, ChevronDown, ChevronUp, MessageCircle, Zap, Lock } from 'lucide-react';
import { toast } from "sonner";
import TicketChat from '@/components/TicketChat';

const TICKET_TYPES = [
  { value: 'problema_tecnico', label: 'Problema Técnico', icon: Zap, color: 'text-red-500 bg-red-50 border-red-200' },
  { value: 'pagamento', label: 'Pagamento', icon: Lock, color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { value: 'duvida', label: 'Dúvida', icon: HelpCircle, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { value: 'outro', label: 'Outro', icon: AlertCircle, color: 'text-gray-500 bg-gray-50 border-gray-200' },
];

const STATUS_CONFIG = {
  aberto: { label: 'Aberto', color: 'bg-yellow-100 text-yellow-800' },
  em_atendimento: { label: 'Em atendimento', color: 'bg-blue-100 text-blue-800' },
  resolvido: { label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  fechado: { label: 'Fechado', color: 'bg-gray-100 text-gray-800' },
};

export default function ProviderTicketForm({ providerId, providerName, providerEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({ type: '', subject: '', message: '' });
  const [openChatTicketId, setOpenChatTicketId] = useState(null);
  const queryClient = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ['provider-tickets', providerId],
    queryFn: () => base44.entities.Ticket.filter({ provider_id: providerId }, '-created_date'),
    enabled: !!providerId,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  const createTicket = useMutation({
    mutationFn: (data) => base44.entities.Ticket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-tickets', providerId] });
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
      provider_id: providerId,
      provider_name: providerName,
      provider_email: providerEmail,
      status: 'aberto',
    });
  };

  const openTickets = tickets.filter(t => t.status !== 'fechado' && t.status !== 'resolvido');
  const ticketsWithResponse = tickets.filter(t => t.response && !showHistory);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          🆘 Suporte Técnico
        </h3>
        {openTickets.length > 0 && (
          <Badge className="bg-primary/10 text-primary border-0">
            {openTickets.length} aberto(s)
          </Badge>
        )}
      </div>

      {!showForm ? (
        <div className="space-y-4">
          {/* Botão principal */}
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-4 hover:border-primary/40 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Abrir ticket de suporte</p>
                <p className="text-xs text-muted-foreground">Reporte problemas ou dúvidas técnicas</p>
              </div>
            </div>
          </button>

          {/* Respostas recebidas em destaque */}
          {ticketsWithResponse.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary flex items-center gap-1">
                💬 Você recebeu resposta do suporte:
              </p>
              {ticketsWithResponse.map(ticket => {
                const typeConfig = TICKET_TYPES.find(t => t.value === ticket.type);
                const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.aberto;
                const Icon = typeConfig?.icon || AlertCircle;
                const chatOpen = openChatTicketId === ticket.id;
                return (
                  <Card key={ticket.id} className="border-primary/30 bg-primary/5 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-3.5 h-3.5 ${typeConfig?.color.split(' ')[0]}`} />
                        <span className="font-semibold text-sm text-foreground flex-1 truncate">{ticket.subject}</span>
                        <Badge className={`text-xs border-0 ${statusConfig.color}`}>{statusConfig.label}</Badge>
                      </div>
                      <div className="bg-white border border-primary/20 rounded-xl p-3 mb-2">
                        <p className="text-xs font-semibold text-primary mb-1">✅ Resposta do suporte:</p>
                        <p className="text-sm text-foreground">{ticket.response}</p>
                        {ticket.attendant_name && (
                          <p className="text-xs text-muted-foreground mt-1">— {ticket.attendant_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setOpenChatTicketId(chatOpen ? null : ticket.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          chatOpen ? 'bg-blue-100 text-blue-700' : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {chatOpen ? 'Fechar chat' : 'Responder pelo chat'}
                      </button>
                      {chatOpen && (
                        <div className="mt-2 border border-blue-200 rounded-2xl overflow-hidden">
                          <TicketChat
                            ticketId={ticket.id}
                            senderRole="prestador"
                            senderName={providerName || 'Prestador'}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

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
                const Icon = typeConfig?.icon || AlertCircle;
                const chatOpen = openChatTicketId === ticket.id;
                return (
                  <Card key={ticket.id} className="border-border overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${typeConfig?.color.split(' ')[0]}`} />
                          <span className="font-semibold text-sm text-foreground">{ticket.subject}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-xs border-0 ${statusConfig.color}`}>{statusConfig.label}</Badge>
                          {ticket.status !== 'fechado' && (
                            <button
                              onClick={() => setOpenChatTicketId(chatOpen ? null : ticket.id)}
                              className={`p-1.5 rounded-lg transition-colors ${chatOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-muted text-muted-foreground'}`}
                              title="Chat com atendente"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

                      {/* Chat em tempo real */}
                      {chatOpen && (
                        <div className="mt-3 border border-blue-200 rounded-2xl overflow-hidden">
                          <TicketChat
                            ticketId={ticket.id}
                            senderRole="prestador"
                            senderName={providerName || 'Prestador'}
                          />
                        </div>
                      )}
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
              <CardTitle className="text-base">Novo Ticket de Suporte</CardTitle>
              <button onClick={() => { setShowForm(false); setForm({ type: '', subject: '', message: '' }); }} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Ex: Problema ao receber pagamento"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Mensagem *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Descreva o problema detalhadamente..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowForm(false); setForm({ type: '', subject: '', message: '' }); }}>
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