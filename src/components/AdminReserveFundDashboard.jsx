import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, TrendingUp, ChevronRight, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AdminReserveFundDashboard() {
  const queryClient = useQueryClient();
  const [expandedFund, setExpandedFund] = useState(null);
  const [approvingFund, setApprovingFund] = useState(null);

  const { data: reserveFunds = [], isLoading } = useQuery({
    queryKey: ['admin-reserve-funds'],
    queryFn: () => base44.entities.ReserveFund.filter({}, '-created_date', 100),
  });

  const approvePIXMutation = useMutation({
    mutationFn: (fundId) =>
      base44.entities.ReserveFund.update(fundId, {
        status: 'encerrado',
        termination_approval_date: new Date().toISOString(),
        pix_sent_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reserve-funds'] });
      toast.success('PIX aprovado e enviado!');
      setApprovingFund(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao aprovar PIX');
    },
  });

  const denyTerminationMutation = useMutation({
    mutationFn: (fundId) =>
      base44.entities.ReserveFund.update(fundId, {
        status: 'ativo',
        termination_request_date: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reserve-funds'] });
      toast.info('Encerramento rejeitado');
      setApprovingFund(null);
    },
  });

  // Calcula totais
  const totalCustodiado = reserveFunds.reduce((sum, f) => sum + (f.total_accumulated || 0), 0);
  const activePJs = reserveFunds.filter(f => f.status === 'ativo').length;
  const pendingTerminations = reserveFunds.filter(f => f.status === 'em_rescisao');

  // Formata data para cálculo de dias
  const getDaysRemaining = (lastServiceDate) => {
    if (!lastServiceDate) return null;
    const releaseDate = new Date(lastServiceDate);
    releaseDate.setMonth(releaseDate.getMonth() + 3);
    const today = new Date();
    return Math.max(0, Math.ceil((releaseDate - today) / (1000 * 60 * 60 * 24)));
  };

  if (isLoading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 opacity-80" />
            <p className="text-sm font-semibold opacity-90">Total Custodiado</p>
          </div>
          <p className="text-3xl font-bold">R$ {totalCustodiado.toFixed(2)}</p>
          <p className="text-xs opacity-80 mt-1">de {activePJs} PJs ativas</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 opacity-80" />
            <p className="text-sm font-semibold opacity-90">Encerr. Pendentes</p>
          </div>
          <p className="text-3xl font-bold">{pendingTerminations.length}</p>
          <p className="text-xs opacity-80 mt-1">aguardando aprovação</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <p className="text-sm font-semibold opacity-90">PJs Ativas</p>
          </div>
          <p className="text-3xl font-bold">{activePJs}</p>
          <p className="text-xs opacity-80 mt-1">com fundos acumulados</p>
        </motion.div>
      </div>

      {/* Tabela de fundos */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Fundos de Reserva por Prestador</h2>
        </div>

        <div className="divide-y divide-border">
          {reserveFunds.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum fundo de reserva criado ainda
            </div>
          ) : (
            reserveFunds.map(fund => {
              const daysRemaining = getDaysRemaining(fund.last_service_date);
              const canRelease = daysRemaining !== null && daysRemaining <= 0;

              return (
                <motion.div
                  key={fund.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedFund(expandedFund === fund.id ? null : fund.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground">{fund.provider_name}</p>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <span className="text-xs text-muted-foreground">
                          Acumulado: <strong>R$ {fund.total_accumulated.toFixed(2)}</strong>
                        </span>
                        {fund.last_service_date && (
                          <span className="text-xs text-muted-foreground">
                            Último serviço: {new Date(fund.last_service_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {daysRemaining !== null && (
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded",
                            daysRemaining <= 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          )}>
                            {daysRemaining <= 0 ? '✅ Liberado' : `⏳ ${daysRemaining} dias`}
                          </span>
                        )}
                        <Badge className={cn(
                          fund.status === 'ativo' ? 'bg-blue-100 text-blue-700' :
                          fund.status === 'em_rescisao' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        )}>
                          {fund.status === 'ativo' ? 'Ativo' :
                           fund.status === 'em_rescisao' ? 'Encerr. Pendente' :
                           'Encerrado'}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform",
                      expandedFund === fund.id && "rotate-90"
                    )} />
                  </div>

                  {/* Expandido */}
                  {expandedFund === fund.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-border space-y-3"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-muted-foreground mb-1">Acumulado</p>
                          <p className="font-bold">R$ {fund.total_accumulated.toFixed(2)}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-muted-foreground mb-1">Bloqueado</p>
                          <p className="font-bold">R$ {fund.blocked_amount.toFixed(2)}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-muted-foreground mb-1">Debitado</p>
                          <p className="font-bold text-red-600">-R$ {fund.debited_amount.toFixed(2)}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-muted-foreground mb-1">A Pagar</p>
                          <p className="font-bold text-green-600">
                            R$ {(fund.total_accumulated - fund.debited_amount).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Ações se em rescisão */}
                      {fund.status === 'em_rescisao' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-bold text-yellow-900">Solicitação de Encerramento</p>
                          <p className="text-xs text-yellow-800">
                            Solicitado em: {new Date(fund.termination_request_date).toLocaleDateString('pt-BR')}
                          </p>
                          {canRelease ? (
                            <p className="text-xs text-green-700 font-semibold">✅ Pode ser liberado (3 meses completos)</p>
                          ) : (
                            <p className="text-xs text-yellow-700">⏳ Aguardando 3 meses do último serviço</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs"
                              onClick={() => setApprovingFund(fund.id)}
                              disabled={!canRelease}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Aprovar PIX
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-lg text-xs"
                              onClick={() => denyTerminationMutation.mutate(fund.id)}
                            >
                              Recusar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Confirmação de PIX */}
                      {approvingFund === fund.id && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-bold text-blue-900">Confirmar PIX</p>
                          <p className="text-xs text-blue-800">
                            Será enviado <strong>R$ {(fund.total_accumulated - fund.debited_amount).toFixed(2)}</strong> via PIX para o prestador.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                              onClick={() => approvePIXMutation.mutate(fund.id)}
                              disabled={approvePIXMutation.isPending}
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              Confirmar e Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg text-xs"
                              onClick={() => setApprovingFund(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {fund.status === 'encerrado' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-900 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Encerrado em {new Date(fund.pix_sent_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}