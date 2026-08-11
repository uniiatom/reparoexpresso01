import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, AlertCircle, HelpCircle, Lock, LogIn, LogOut, Send, ChevronDown, ChevronUp, User, Settings, Zap, History, CalendarDays, MessageCircle, Search, X } from 'lucide-react';
import TicketChat from '@/components/TicketChat';
import { toast } from "sonner";
import AttendantsManager, { loadAttendants } from './AttendantsManager';
import { logAdminAction } from '@/lib/adminLog';
import { useAttendantPush } from '@/hooks/useAttendantPush';
import AttendantPushBanner from './AttendantPushBanner';
import { QuickReplyPicker } from './QuickReplies';
import QuickRepliesManager from './QuickReplies';
import ClientHistoryPanel from './ClientHistoryPanel';
import ScheduledCalendar from './ScheduledCalendar';

const TICKET_TYPES = {
  reclamacao: { label: 'Reclamação', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  elogio: { label: 'Elogio', icon: ThumbsUp, color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
  sugestao: { label: 'Sugestão', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  duvida: { label: 'Dúvida', icon: HelpCircle, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
};

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'em_atendimento', label: 'Em atendimento', color: 'bg-blue-100 text-blue-800' },
  { value: 'resolvido', label: 'Resolvido', color: 'bg-green-100 text-green-800' },
  { value: 'fechado', label: 'Fechado', color: 'bg-gray-100 text-gray-800' },
];

const PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
  { value: 'media', label: 'Média', color: 'bg-blue-100 text-blue-700' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-700' },
];

function LoginPanel({ onLogin }) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const handleLogin = () => {
    const attendant = loadAttendants().find(a => a.login === loginInput && a.password === passwordInput);
    if (attendant) {
      onLogin(attendant);
      toast.success(`Bem-vindo(a), ${attendant.name}!`);
    } else {
      toast.error('Login ou senha incorretos');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-1">Área do Atendente</h3>
      <p className="text-sm text-muted-foreground mb-8">Faça login para gerenciar os tickets</p>

      <div className="w-full max-w-xs space-y-3">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">Login</label>
          <input
            type="text"
            value={loginInput}
            onChange={e => setLoginInput(e.target.value)}
            placeholder="seu.login"
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">Senha</label>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button onClick={handleLogin} className="w-full rounded-xl gap-2">
          <LogIn className="w-4 h-4" /> Entrar
        </Button>
      </div>
    </div>
  );
}

function TicketCard({ ticket, attendant, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [response, setResponse] = useState(ticket.response || '');
  const [notes, setNotes] = useState(ticket.internal_notes || '');
  const [status, setStatus] = useState(ticket.status);
  const queryClient = useQueryClient();

  const typeConfig = TICKET_TYPES[ticket.type] || TICKET_TYPES.duvida;
  const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === ticket.priority) || PRIORITY_OPTIONS[1];
  const Icon = typeConfig.icon;

  const updateTicket = useMutation({
    mutationFn: (data) => base44.entities.Ticket.update(ticket.id, data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('Ticket atualizado com sucesso');
      onUpdate();
      // Log de status alterado
      if (data.status && data.status !== ticket.status) {
        logAdminAction({
          action: 'ticket_status_changed',
          actorName: attendant.name,
          actorEmail: attendant.login,
          entityType: 'Ticket',
          entityId: ticket.id,
          entityLabel: ticket.subject,
          oldValue: ticket.status,
          newValue: data.status,
        });
      }
      // Log de resposta enviada
      if (data.response && !ticket.responded_at) {
        logAdminAction({
          action: 'ticket_responded',
          actorName: attendant.name,
          actorEmail: attendant.login,
          entityType: 'Ticket',
          entityId: ticket.id,
          entityLabel: ticket.subject,
          details: data.response.substring(0, 120),
        });
      }
    },
  });

  const handleSave = () => {
    const updates = {
      status,
      response,
      internal_notes: notes,
      attendant_name: attendant.name,
      attendant_login: attendant.login,
    };
    if (status === 'resolvido' && !ticket.resolved_at) {
      updates.resolved_at = new Date().toISOString();
    }
    if (response && !ticket.responded_at) {
      updates.responded_at = new Date().toISOString();
    }
    updateTicket.mutate(updates);
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${expanded ? 'border-primary/30' : 'border-border'}`}>
      {/* Painel lateral de histórico */}
      {showHistory && (
        <div className="border-b border-border" style={{ maxHeight: 420 }}>
          <ClientHistoryPanel
            clientId={ticket.client_id}
            clientName={ticket.client_name}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}

      <div className="bg-card p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-xl border flex-shrink-0 ${typeConfig.bg}`}>
              <Icon className={`w-4 h-4 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-foreground text-sm">{ticket.subject}</span>
                <Badge className={`text-xs border-0 ${statusConfig.color}`}>{statusConfig.label}</Badge>
                <Badge className={`text-xs border-0 ${priorityConfig.color}`}>{priorityConfig.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                👤 {ticket.client_name || 'Cliente'} · {new Date(ticket.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
              {ticket.attendant_name && (
                <p className="text-xs text-muted-foreground">🎧 {ticket.attendant_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowHistory(s => !s)}
              title="Histórico do cliente"
              className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowChat(s => !s)}
              title="Chat com cliente"
              className={`p-1.5 rounded-lg transition-colors ${showChat ? 'bg-blue-100 text-blue-600' : 'hover:bg-muted text-muted-foreground'}`}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-muted rounded-lg"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <p className="text-sm text-foreground mb-2 line-clamp-2">{ticket.message}</p>

        {/* Chat em tempo real */}
        {showChat && (
          <div className="mt-3 border border-blue-200 rounded-2xl overflow-hidden">
            <TicketChat
              ticketId={ticket.id}
              senderRole="atendente"
              senderName={attendant.name}
            />
          </div>
        )}

        {expanded && (
          <div className="space-y-4 mt-4 border-t border-border pt-4">

            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Mensagem completa:</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.message}</p>
            </div>

            {/* Status e prioridade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{attendant.name}</span>
                </div>
              </div>
            </div>

            {/* Resposta ao cliente */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Resposta ao cliente</label>
                <QuickReplyPicker onSelect={(text) => setResponse(prev => prev ? prev + '\n\n' + text : text)} />
              </div>
              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Escreva uma resposta ou use uma resposta rápida..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Notas internas */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Notas internas (não visíveis ao cliente)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anotações internas da tratativa..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <Button onClick={handleSave} className="w-full rounded-xl gap-2" disabled={updateTicket.isPending}>
              <Send className="w-4 h-4" />
              {updateTicket.isPending ? 'Salvando...' : 'Salvar tratativa'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TicketsAdmin() {
  const [attendant, setAttendant] = useState(null);
  const [activeTab, setActiveTab] = useState('tickets');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterType, setFilterType] = useState('todos');
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const queryClient = useQueryClient();

  // Sistema de notificações push para atendentes
  useAttendantPush(attendant);

  // Refetch imediato ao logar
  useEffect(() => {
    if (attendant) refetch();
  }, [attendant]);

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date', 200),
    enabled: !!attendant,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Mapa de service_request_id -> service_number para busca por nº do atendimento
  const { data: serviceNumberMap = {} } = useQuery({
    queryKey: ['admin-tickets-service-numbers'],
    queryFn: async () => {
      const ids = [...new Set(tickets.map(t => t.service_request_id).filter(Boolean))];
      if (!ids.length) return {};
      const reqs = await Promise.all(ids.map(id => base44.entities.ServiceRequest.filter({ id }).then(r => r[0]).catch(() => null)));
      const map = {};
      reqs.filter(Boolean).forEach(r => { map[r.id] = r.service_number || ''; });
      return map;
    },
    enabled: !!attendant && tickets.length > 0,
  });

  const filtered = tickets.filter(t => {
    const matchStatus = filterStatus === 'todos' || t.status === filterStatus;
    const matchType = filterType === 'todos' || t.type === filterType;
    const q = search.trim().toLowerCase();
    const serviceNum = (t.service_request_id && serviceNumberMap[t.service_request_id]) || '';
    const matchSearch = !q
      || serviceNum.toLowerCase().includes(q)
      || (t.service_request_id && t.service_request_id.toLowerCase().includes(q))
      || (t.client_name && t.client_name.toLowerCase().includes(q))
      || (t.client_email && t.client_email.toLowerCase().includes(q))
      || (t.subject && t.subject.toLowerCase().includes(q));
    return matchStatus && matchType && matchSearch;
  });

  const counts = {
    aberto: tickets.filter(t => t.status === 'aberto').length,
    em_atendimento: tickets.filter(t => t.status === 'em_atendimento').length,
    resolvido: tickets.filter(t => t.status === 'resolvido').length,
  };

  // Tickets abertos sem atendente (novos chegando)
  const unattendedCount = tickets.filter(t => t.status === 'aberto' && !t.attendant_login).length;

  if (!attendant) {
    return (
      <div>
        <div className="flex justify-end mb-3">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs" onClick={() => setShowManage(!showManage)}>
            <Settings className="w-3.5 h-3.5" /> {showManage ? 'Voltar ao login' : 'Gerenciar atendentes'}
          </Button>
        </div>
        {showManage
          ? <AttendantsManager onClose={() => setShowManage(false)} />
          : <LoginPanel onLogin={setAttendant} />
        }
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner de permissão push */}
      <AttendantPushBanner />

      {/* Header do atendente */}
      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{attendant.name}</p>
            <p className="text-xs text-muted-foreground">@{attendant.login}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={() => { setShowQuickReplies(s => !s); }}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            {showQuickReplies ? 'Fechar' : 'Respostas'}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setAttendant(null)}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>

      {/* Gerenciador de respostas rápidas */}
      {showQuickReplies && (
        <div className="border border-amber-200 bg-amber-50/30 rounded-2xl p-4">
          <QuickRepliesManager />
        </div>
      )}

      {/* Navegação: Tickets | Calendário */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'tickets'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Tickets
        </button>
        <button
          onClick={() => setActiveTab('calendario')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'calendario'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Calendário de Agendamentos
        </button>
      </div>

      {/* Calendário */}
      {activeTab === 'calendario' && (
        <ScheduledCalendar />
      )}

      {activeTab === 'tickets' && <>

      {/* Alerta de tickets sem atendente */}
      {unattendedCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-yellow-800 font-semibold animate-pulse">
          <span>🔔</span>
          <span>{unattendedCount} ticket(s) novo(s) sem atendente!</span>
          <button onClick={() => refetch()} className="ml-auto text-xs underline">Atualizar</button>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: tickets.length, color: 'text-foreground' },
          { label: 'Abertos', value: counts.aberto, color: 'text-yellow-600' },
          { label: 'Em atend.', value: counts.em_atendimento, color: 'text-blue-600' },
          { label: 'Resolvidos', value: counts.resolvido, color: 'text-green-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nº do atendimento, nome ou e-mail do cliente..."
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos status</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos tipos</option>
          {Object.entries(TICKET_TYPES).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum ticket encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              attendant={attendant}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })}
            />
          ))}
        </div>
      )}
      </>}
    </div>
  );
}