import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ServicePriceHistoryPanel({ serviceId }) {
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;

    setLoading(true);
    base44.entities.ServicePriceHistory.filter(
      { service_id: serviceId },
      'created_date',
      100
    )
      .then(setHistory)
      .catch(e => console.warn('Error fetching history:', e.message))
      .finally(() => setLoading(false));

    const unsub = base44.entities.ServicePriceHistory.subscribe((event) => {
      if (event.data?.service_id === serviceId) {
        setHistory(prev => [...prev, event.data]);
      }
    });

    return unsub;
  }, [serviceId]);

  if (loading || history.length === 0) {
    return null;
  }

  const eventIcons = {
    initial_estimate: '📋',
    extra_charges_requested: '💰',
    extra_charges_approved: '✓',
    extra_charges_rejected: '✕',
    extra_charges_negotiated: '💬',
    price_adjustment: '🔧',
    final_price_set: '✅',
  };

  const eventLabels = {
    initial_estimate: 'Orçamento inicial',
    extra_charges_requested: 'Orçamento extra solicitado',
    extra_charges_approved: 'Orçamento extra aprovado',
    extra_charges_rejected: 'Orçamento extra rejeitado',
    extra_charges_negotiated: 'Orçamento renegociado',
    price_adjustment: 'Ajuste de preço',
    final_price_set: 'Preço final definido',
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'negotiated':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'pending':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getPriceChangeIcon = (prev, curr) => {
    if (!prev) return null;
    if (curr > prev) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (curr < prev) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return null;
  };

  return (
    <div className="bg-card rounded-3xl border border-border mb-5 overflow-hidden">
      {/* Header colapsável */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📊</span>
          <div className="text-left">
            <p className="font-semibold text-foreground">Histórico de valores</p>
            <p className="text-xs text-muted-foreground">{history.length} alteração{history.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-muted-foreground transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Timeline expandida */}
      {expanded && (
        <div className="border-t border-border p-5 space-y-4 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma alteração registrada</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry, idx) => (
                <div key={entry.id} className="flex gap-3">
                  {/* Linha vertical conectora */}
                  {idx < history.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-xs">
                        {eventIcons[entry.event_type]}
                      </div>
                      <div className="w-0.5 h-6 bg-border my-1" />
                    </div>
                  )}
                  {idx === history.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-xs">
                        {eventIcons[entry.event_type]}
                      </div>
                    </div>
                  )}

                  {/* Conteúdo */}
                  <div className="flex-1 pb-3">
                    <div className={cn(
                      "rounded-2xl border p-3 space-y-2",
                      getStatusColor(entry.status)
                    )}>
                      {/* Título e data */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">
                          {eventLabels[entry.event_type]}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Valores */}
                      <div className="flex items-center gap-2 text-sm">
                        {entry.previous_price !== undefined && (
                          <>
                            <span className="text-muted-foreground line-through">
                              R$ {entry.previous_price.toFixed(2)}
                            </span>
                            {getPriceChangeIcon(entry.previous_price, entry.new_price)}
                          </>
                        )}
                        <span className="font-bold">
                          R$ {entry.new_price.toFixed(2)}
                        </span>
                        {entry.extra_charges_total && (
                          <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                            +R$ {entry.extra_charges_total.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Ator */}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>👤 {entry.actor_name || 'Desconhecido'}</span>
                        <span>({entry.actor_type})</span>
                      </div>

                      {/* Motivo/Notas */}
                      {entry.reason && (
                        <p className="text-xs bg-white/40 rounded px-2 py-1">
                          <strong>Motivo:</strong> {entry.reason}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-xs bg-white/40 rounded px-2 py-1">
                          <strong>Notas:</strong> {entry.notes}
                        </p>
                      )}

                      {/* Status badge */}
                      {entry.status && entry.status !== 'pending' && (
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          {entry.status === 'approved' && (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aprovado</span>
                            </>
                          )}
                          {entry.status === 'rejected' && (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Rejeitado</span>
                            </>
                          )}
                          {entry.status === 'negotiated' && (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Em Negociação</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}