import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Lock, Clock, AlertCircle, ChevronRight, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ProviderReserveFund({ providerId }) {
  const [showHistory, setShowHistory] = useState(false);

  const { data: reserveFund, isLoading } = useQuery({
    queryKey: ['reserve-fund', providerId],
    queryFn: async () => {
      const list = await base44.entities.ReserveFund.filter({ provider_id: providerId });
      return list[0] || null;
    },
    enabled: !!providerId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['reserve-fund-transactions', providerId],
    queryFn: () => base44.entities.ReserveFundTransaction.filter({ provider_id: providerId }, '-created_date'),
    enabled: !!providerId,
  });

  const requestTerminationMutation = useMutation({
    mutationFn: () =>
      base44.entities.ReserveFund.update(reserveFund.id, {
        status: 'em_rescisao',
        termination_request_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast.success('Solicitação de encerramento enviada. Aguarde aprovação do admin.');
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao solicitar encerramento');
    },
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl p-6 border border-border animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-3" />
        <div className="h-8 bg-muted rounded w-1/3" />
      </div>
    );
  }

  if (!reserveFund) {
    return (
      <div className="bg-card rounded-3xl p-6 border border-border text-center">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold text-foreground">Nenhum fundo de reserva</p>
        <p className="text-xs text-muted-foreground mt-1">Após concluir serviços, um fundo será criado automaticamente.</p>
      </div>
    );
  }

  // Calcula dias restantes até liberar
  let daysRemaining = null;
  if (reserveFund.last_service_date) {
    const lastServiceDate = new Date(reserveFund.last_service_date);
    const releaseDate = new Date(lastServiceDate);
    releaseDate.setMonth(releaseDate.getMonth() + 3);
    const today = new Date();
    daysRemaining = Math.max(0, Math.ceil((releaseDate - today) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-4">
      {/* Card principal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl p-5 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-5 h-5 opacity-80" />
          <p className="text-sm font-semibold opacity-90">Fundo de Reserva em Garantia</p>
        </div>
        <p className="text-4xl font-bold mb-1">R$ {(reserveFund.total_accumulated || 0).toFixed(2)}</p>
        <p className="text-amber-100 text-xs">bloqueado até liberar</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{daysRemaining || 0}</p>
            <p className="text-xs opacity-80">dias até liberar</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">R$ {(reserveFund.debited_amount || 0).toFixed(2)}</p>
            <p className="text-xs opacity-80">debitado</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 mt-4 border border-white/20">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Como funciona
          </p>
          <p className="text-xs opacity-90 leading-relaxed">
            Este valor é liberado apenas em caso de encerramento da parceria, após 3 meses do seu último serviço e sem pendências com clientes.
          </p>
        </div>

        {/* Botão de encerramento */}
        {reserveFund.status === 'ativo' && (
          <Button
            className="w-full mt-4 bg-white text-amber-600 hover:bg-amber-50 font-bold rounded-2xl"
            onClick={() => requestTerminationMutation.mutate()}
            disabled={requestTerminationMutation.isPending}
          >
            Solicitar Encerramento
          </Button>
        )}

        {reserveFund.status === 'em_rescisao' && (
          <div className="mt-4 bg-white/10 rounded-2xl p-3 text-center text-xs font-semibold">
            ⏳ Aguardando aprovação do administrador
          </div>
        )}

        {reserveFund.status === 'encerrado' && (
          <div className="mt-4 bg-green-500/30 rounded-2xl p-3 text-center text-xs font-semibold">
            ✅ Fundo encerrado e saque realizado
          </div>
        )}
      </motion.div>

      {/* Histórico */}
      {transactions.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <TrendingDown className="w-4 h-4" />
            Histórico de transações ({transactions.length})
            <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showHistory && "rotate-90")} />
          </button>

          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 space-y-2"
            >
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className={cn(
                    "bg-card rounded-2xl p-3 border flex items-start gap-3",
                    tx.type === 'retencao' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                    tx.type === 'retencao' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  )}>
                    {tx.type === 'retencao' ? '⏸️' : '📉'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{tx.reason}</p>
                    {tx.blocked_until && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        Liberado em {new Date(tx.blocked_until).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {tx.related_complaint_id && (
                      <p className="text-xs text-red-700 mt-1">Reclamação: {tx.related_complaint_id}</p>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm font-bold flex-shrink-0",
                    tx.type === 'retencao' ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {tx.type === 'retencao' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Info detalhe */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2 text-xs text-blue-800">
        <p className="font-bold text-sm text-blue-900">📋 Detalhes do Fundo de Reserva</p>
        <p><strong>Retenção:</strong> 3% de cada serviço pago é retido automaticamente</p>
        <p><strong>Prazo:</strong> Fica bloqueado por 3 meses após cada serviço</p>
        <p><strong>Uso:</strong> Pode ser debitado em caso de indenização a cliente</p>
        <p><strong>Resgate:</strong> Disponível apenas ao encerrar parceria, sem pendências</p>
      </div>
    </div>
  );
}