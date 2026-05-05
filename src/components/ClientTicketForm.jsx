import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, AlertCircle, HelpCircle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [form, setForm] = useState({ type: '', subject: '', message: '' });
  const queryClient = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', clientId],
    queryFn: () => base44.entities.Ticket.filter({ client_id: clientId }, '-created_date'),
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
      status: 'aberto',
    });
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
        <div className="space-y-3">
          <button
            onClick={() => setShowForm(true)}
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
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded-lg">
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
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>
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