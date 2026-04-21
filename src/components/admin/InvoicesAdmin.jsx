import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, CheckCircle2, DollarSign, Clock, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '📤' },
  recebida: { label: 'Recebida', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '✅' },
  paga: { label: 'Paga', color: 'bg-green-100 text-green-700 border-green-200', icon: '💰' },
  baixada: { label: 'Baixada', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '📋' },
};

export default function InvoicesAdmin() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchProvider, setSearchProvider] = useState('');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['all-invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 100),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => {
      const updateData = { status };
      if (status === 'recebida') updateData.received_date = new Date().toISOString();
      if (status === 'paga') updateData.paid_date = new Date().toISOString();
      if (status === 'baixada') updateData.low_date = new Date().toISOString();
      return base44.entities.Invoice.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      toast.success('Status atualizado!');
    },
  });

  const addPaymentNoteMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Invoice.update(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      toast.success('Observação salva!');
    },
  });

  const filteredInvoices = invoices.filter(inv => {
    const statusMatch = filterStatus === 'all' || inv.status === filterStatus;
    const providerMatch = !searchProvider || inv.provider_name?.toLowerCase().includes(searchProvider.toLowerCase());
    return statusMatch && providerMatch;
  });

  const stats = {
    enviadas: invoices.filter(i => i.status === 'enviada').length,
    recebidas: invoices.filter(i => i.status === 'recebida').length,
    pagas: invoices.filter(i => i.status === 'paga').length,
    baixadas: invoices.filter(i => i.status === 'baixada').length,
    totalValue: invoices.reduce((sum, i) => sum + (i.amount || 0), 0),
  };

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Enviadas', value: stats.enviadas, color: 'bg-blue-100 text-blue-700' },
          { label: 'Recebidas', value: stats.recebidas, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Pagas', value: stats.pagas, color: 'bg-green-100 text-green-700' },
          { label: 'Baixadas', value: stats.baixadas, color: 'bg-slate-100 text-slate-700' },
          { label: 'Total', value: `R$ ${stats.totalValue.toFixed(0)}`, color: 'bg-primary/10 text-primary' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-3 text-center', s.color)}>
            <p className="text-xs font-semibold opacity-75">{s.label}</p>
            <p className="text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Buscar prestador..."
          value={searchProvider}
          onChange={(e) => setSearchProvider(e.target.value)}
          className="flex-1 min-w-48 text-sm"
        />
        <div className="flex gap-1 flex-wrap">
          {['all', 'enviada', 'recebida', 'paga', 'baixada'].map(s => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'Todas' : STATUS_CONFIG[s]?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de notas */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Nenhuma nota fiscal</div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map(invoice => {
            const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.enviada;
            return (
              <div key={invoice.id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-foreground text-sm">{invoice.invoice_number}</p>
                      <Badge className={cn('text-xs border', config.color)}>{config.icon} {config.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <strong>{invoice.provider_name}</strong> · R$ {invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{invoice.description}</p>
                  </div>
                  <p className="text-sm font-bold text-primary shrink-0">R$ {invoice.amount.toFixed(2)}</p>
                </div>

                {/* Histórico de datas */}
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div className="bg-blue-50 rounded-lg p-1.5 text-center">
                    <p className="font-semibold text-blue-700">Enviada</p>
                    <p className="text-[10px] text-blue-600">{new Date(invoice.created_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className={cn('rounded-lg p-1.5 text-center', invoice.received_date ? 'bg-yellow-50' : 'bg-muted')}>
                    <p className={cn('font-semibold', invoice.received_date ? 'text-yellow-700' : 'text-muted-foreground')}>Recebida</p>
                    {invoice.received_date && <p className="text-[10px] text-yellow-600">{new Date(invoice.received_date).toLocaleDateString('pt-BR')}</p>}
                  </div>
                  <div className={cn('rounded-lg p-1.5 text-center', invoice.paid_date ? 'bg-green-50' : 'bg-muted')}>
                    <p className={cn('font-semibold', invoice.paid_date ? 'text-green-700' : 'text-muted-foreground')}>Paga</p>
                    {invoice.paid_date && <p className="text-[10px] text-green-600">{new Date(invoice.paid_date).toLocaleDateString('pt-BR')}</p>}
                  </div>
                  <div className={cn('rounded-lg p-1.5 text-center', invoice.low_date ? 'bg-slate-50' : 'bg-muted')}>
                    <p className={cn('font-semibold', invoice.low_date ? 'text-slate-700' : 'text-muted-foreground')}>Baixada</p>
                    {invoice.low_date && <p className="text-[10px] text-slate-600">{new Date(invoice.low_date).toLocaleDateString('pt-BR')}</p>}
                  </div>
                </div>

                {/* Fluxo rápido de status */}
                <div className="flex items-center gap-1 text-xs bg-muted rounded-lg p-1.5">
                  {['enviada', 'recebida', 'paga', 'baixada'].map((s, i) => (
                    <React.Fragment key={s}>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: invoice.id, status: s })}
                        disabled={updateStatusMutation.isPending}
                        className={cn(
                          'flex-1 py-1 px-1.5 rounded font-semibold transition-all text-[11px]',
                          invoice.status === s
                            ? STATUS_CONFIG[s].color + ' border border-current'
                            : 'text-muted-foreground hover:bg-muted/80'
                        )}
                        title={`Marcar como ${STATUS_CONFIG[s].label}`}
                      >
                        {STATUS_CONFIG[s].icon}
                      </button>
                      {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {invoice.file_url && (
                    <a
                      href={invoice.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-lg py-1.5 hover:bg-primary/20 transition"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                  )}
                </div>

                {/* Campo de observações para admin */}
                {invoice.status !== 'baixada' && (
                  <div className="pt-1 border-t border-border">
                    <input
                      type="text"
                      placeholder="Adicionar observação..."
                      defaultValue={invoice.notes || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (invoice.notes || '')) {
                          addPaymentNoteMutation.mutate({ id: invoice.id, notes: e.target.value });
                        }
                      }}
                      className="w-full text-xs bg-muted rounded-lg px-2 py-1.5 border border-transparent focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}