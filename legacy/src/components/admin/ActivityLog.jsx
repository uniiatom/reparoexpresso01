import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, AlertTriangle, MessageSquare,
  DollarSign, UserCheck, RefreshCw, Shield, FileText, Search
} from 'lucide-react';

const ACTION_CONFIG = {
  provider_approved:     { label: 'Prestador aprovado',       icon: UserCheck,    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  provider_rejected:     { label: 'Prestador reprovado',      icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  provider_blocked:      { label: 'Prestador bloqueado',      icon: Shield,       color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  ticket_status_changed: { label: 'Status de ticket alterado',icon: MessageSquare,color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  ticket_responded:      { label: 'Ticket respondido',        icon: MessageSquare,color: 'text-primary',     bg: 'bg-primary/5 border-primary/20' },
  repasse_approved:      { label: 'Repasse aprovado',         icon: DollarSign,   color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  repasse_rejected:      { label: 'Repasse rejeitado',        icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  withdrawal_confirmed:  { label: 'Saque confirmado',         icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  withdrawal_reverted:   { label: 'Saque estornado',          icon: RefreshCw,    color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  service_cancelled:     { label: 'Chamado cancelado',        icon: AlertTriangle,color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  document_approved:     { label: 'Documento aprovado',       icon: FileText,     color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  document_rejected:     { label: 'Documento reprovado',      icon: FileText,     color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
};

const ENTITY_FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'Provider', label: 'Prestadores' },
  { value: 'Ticket', label: 'Tickets' },
  { value: 'ServiceRequest', label: 'Chamados' },
  { value: 'WalletTransaction', label: 'Financeiro' },
];

function LogItem({ log }) {
  const cfg = ACTION_CONFIG[log.action] || {
    label: log.action,
    icon: FileText,
    color: 'text-muted-foreground',
    bg: 'bg-muted/40 border-border',
  };
  const Icon = cfg.icon;
  const date = new Date(log.created_date);
  const dateFmt = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeFmt = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={cn('p-1.5 rounded-xl border flex-shrink-0', cfg.bg)}>
        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
          {log.entity_label && (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">· {log.entity_label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">👤 {log.actor_name}</span>
          {log.actor_email && <span className="text-xs text-muted-foreground">({log.actor_email})</span>}
          {log.old_value && log.new_value && (
            <span className="text-xs text-muted-foreground">
              · <span className="line-through">{log.old_value}</span> → <strong className={cfg.color}>{log.new_value}</strong>
            </span>
          )}
        </div>
        {log.details && (
          <p className="text-xs text-muted-foreground mt-0.5 italic">{log.details}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-muted-foreground">{dateFmt}</p>
        <p className="text-xs text-muted-foreground">{timeFmt}</p>
      </div>
    </div>
  );
}

export default function ActivityLog() {
  const [entityFilter, setEntityFilter] = useState('todos');
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-activity-logs'],
    queryFn: () => base44.entities.AdminActivityLog.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const filtered = logs.filter(log => {
    const matchEntity = entityFilter === 'todos' || log.entity_type === entityFilter;
    const matchSearch = !search ||
      log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_label?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      (ACTION_CONFIG[log.action]?.label || log.action).toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchSearch;
  });

  // Contadores por tipo de ação
  const counts = {
    prestadores: logs.filter(l => ['provider_approved', 'provider_rejected', 'provider_blocked'].includes(l.action)).length,
    tickets: logs.filter(l => l.entity_type === 'Ticket').length,
    financeiro: logs.filter(l => ['repasse_approved', 'repasse_rejected', 'withdrawal_confirmed', 'withdrawal_reverted'].includes(l.action)).length,
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ações em prestadores', value: counts.prestadores, color: 'text-blue-600' },
          { label: 'Ações em tickets', value: counts.tickets, color: 'text-primary' },
          { label: 'Ações financeiras', value: counts.financeiro, color: 'text-emerald-600' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-3 text-center">
              <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ator, item..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {ENTITY_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <Badge variant="outline" className="text-xs">{filtered.length} registros</Badge>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-4">
          {isLoading && (
            <p className="text-center text-muted-foreground py-8">Carregando logs...</p>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma atividade registrada</p>
              <p className="text-sm mt-1">Os logs aparecerão aqui conforme as ações forem realizadas</p>
            </div>
          )}
          {filtered.map(log => (
            <LogItem key={log.id} log={log} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}