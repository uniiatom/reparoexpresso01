import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, Wallet, ArrowUpRight,
  ArrowDownLeft, ChevronDown, ChevronUp, RefreshCw, DollarSign, User
} from "lucide-react";

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Cond.", desentupimento: "Desentupimento",
  limpeza_caixa_dagua: "Limpeza Caixa D'água", reboque: "Reboque", outros: "Outros",
};

// Cartão de saldo do prestador
function ProviderWalletCard({ providerId, providerName }) {
  const { data: wallets = [] } = useQuery({
    queryKey: ['wallet-provider', providerId],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: providerId, owner_type: 'prestador' }),
    enabled: !!providerId,
  });
  const wallet = wallets[0];

  return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-2">
      <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <span className="text-xs text-emerald-700 font-medium">Saldo na carteira:</span>
      <span className="text-sm font-bold text-emerald-800">
        {wallet ? `R$ ${wallet.balance?.toFixed(2)}` : '—'}
      </span>
      {wallet?.pending_balance > 0 && (
        <span className="text-xs text-emerald-600">(+ R$ {wallet.pending_balance?.toFixed(2)} pendente)</span>
      )}
    </div>
  );
}

// Card de repasse pendente
function RepasseCard({ request, onApprove, onReject, isProcessing }) {
  const [expanded, setExpanded] = useState(false);

  const serviceFmt = SERVICE_LABELS[request.service_type] || request.service_type;
  const date = new Date(request.created_date).toLocaleDateString('pt-BR');

  // Calcula valor estimado do repasse (70% padrão)
  const repasse = (request.final_price || 0) * 0.7;
  const taxa = (request.final_price || 0) * 0.3;

  return (
    <Card className="border-l-4 border-l-blue-400">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{serviceFmt}</span>
              {request.service_number && (
                <span className="text-xs font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded">{request.service_number}</span>
              )}
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Repasse pendente</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              👤 {request.client_name} · 🔧 {request.provider_name || '—'} · 📅 {date}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-foreground">R$ {(request.final_price || 0).toFixed(2)}</p>
            <p className="text-xs text-emerald-600 font-semibold">→ R$ {repasse.toFixed(2)} prestador</p>
          </div>
        </div>

        {/* Saldo da carteira do prestador */}
        {request.provider_id && (
          <ProviderWalletCard providerId={request.provider_id} providerName={request.provider_name} />
        )}

        {/* Detalhes expandíveis */}
        <button
          className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        </button>

        {expanded && (
          <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-xs">
            <p><span className="text-muted-foreground">Descrição:</span> <span className="font-medium">{request.description}</span></p>
            <p><span className="text-muted-foreground">Endereço:</span> {request.address}, {request.city}/{request.state}</p>
            <p><span className="text-muted-foreground">Valor total:</span> <strong>R$ {(request.final_price || 0).toFixed(2)}</strong></p>
            <div className="flex gap-4 pt-1 border-t border-border">
              <p className="text-emerald-700"><span className="text-muted-foreground">Repasse prestador (70%):</span> <strong>R$ {repasse.toFixed(2)}</strong></p>
              <p className="text-primary"><span className="text-muted-foreground">Taxa plataforma (30%):</span> <strong>R$ {taxa.toFixed(2)}</strong></p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
            onClick={() => onApprove(request.id)}
            disabled={isProcessing}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar repasse
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => onReject(request.id)}
            disabled={isProcessing}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Card de saque pendente (reembolso/withdrawal)
function SaqueCard({ transaction, wallet, onApprove, onReject, isProcessing }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(transaction.created_date).toLocaleDateString('pt-BR');

  return (
    <Card className="border-l-4 border-l-amber-400">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">Saque PIX</span>
              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Aguardando</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              👤 {wallet?.owner_name || transaction.owner_id} · 📅 {date}
            </p>
            {transaction.pix_key && (
              <p className="text-xs text-muted-foreground">
                🔑 {transaction.pix_key} ({transaction.description})
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-amber-700">R$ {(transaction.amount || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Saque solicitado</p>
          </div>
        </div>

        {/* Saldo atual na carteira */}
        {wallet && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <Wallet className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs text-blue-700 font-medium">Saldo atual:</span>
            <span className="text-sm font-bold text-blue-800">R$ {wallet.balance?.toFixed(2)}</span>
          </div>
        )}

        <button
          className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        </button>

        {expanded && (
          <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-xs">
            <p><span className="text-muted-foreground">Tipo de carteira:</span> <span className="capitalize font-medium">{wallet?.owner_type || '—'}</span></p>
            <p><span className="text-muted-foreground">Descrição:</span> {transaction.description}</p>
            <p><span className="text-muted-foreground">Valor solicitado:</span> <strong>R$ {(transaction.amount || 0).toFixed(2)}</strong></p>
            <p><span className="text-muted-foreground">Saldo após saque:</span> <strong>R$ {(transaction.balance_after || 0).toFixed(2)}</strong></p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
            onClick={() => onApprove(transaction.id)}
            disabled={isProcessing}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmar pagamento
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => onReject(transaction.id, transaction.wallet_id, transaction.amount)}
            disabled={isProcessing}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" /> Estornar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReembolsosRepasses() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('repasses');
  const [processingId, setProcessingId] = useState(null);

  // Serviços concluídos sem repasse processado
  const { data: pendingRepasses = [], isLoading: loadingRepasses } = useQuery({
    queryKey: ['pending-repasses'],
    queryFn: async () => {
      const all = await base44.entities.ServiceRequest.filter({ status: 'concluido' }, '-created_date', 100);
      return all.filter(r => r.final_price && r.provider_id && !r.payout_processed_at);
    },
    refetchInterval: 30000,
  });

  // Saques pendentes
  const { data: pendingWithdrawals = [], isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['pending-withdrawals'],
    queryFn: () => base44.entities.WalletTransaction.filter({ type: 'withdrawal', status: 'pending' }, '-created_date', 50),
    refetchInterval: 30000,
  });

  // Wallets para cruzar com as transações
  const walletIds = [...new Set(pendingWithdrawals.map(t => t.wallet_id))];
  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets-for-withdrawals', walletIds.join(',')],
    queryFn: () => base44.entities.Wallet.list('-created_date', 200),
    enabled: pendingWithdrawals.length > 0,
  });
  const walletMap = {};
  wallets.forEach(w => { walletMap[w.id] = w; });

  // Histórico de repasses processados
  const { data: processedRepasses = [], isLoading: loadingProcessed } = useQuery({
    queryKey: ['processed-repasses'],
    queryFn: async () => {
      const all = await base44.entities.ServiceRequest.list('-updated_date', 50);
      return all.filter(r => r.payout_processed_at);
    },
  });

  // Histórico de saques concluídos/revertidos
  const { data: completedWithdrawals = [] } = useQuery({
    queryKey: ['completed-withdrawals'],
    queryFn: () => base44.entities.WalletTransaction.filter({ type: 'withdrawal' }, '-created_date', 50),
  });
  const historicWithdrawals = completedWithdrawals.filter(t => t.status !== 'pending');

  // APROVAR REPASSE: chama a função backend que já existe
  const approveRepasse = useMutation({
    mutationFn: async (serviceRequestId) => {
      const res = await base44.functions.invoke('processProviderRepayment', { serviceRequestId });
      return res.data;
    },
    onMutate: (id) => setProcessingId(id),
    onSettled: () => setProcessingId(null),
    onSuccess: (data) => {
      toast.success(`Repasse de R$ ${data.provider_amount?.toFixed(2)} aprovado para o prestador!`);
      queryClient.invalidateQueries({ queryKey: ['pending-repasses'] });
      queryClient.invalidateQueries({ queryKey: ['processed-repasses'] });
    },
    onError: (err) => toast.error('Erro ao processar repasse: ' + err.message),
  });

  // REJEITAR REPASSE: marca como cancelado manualmente
  const rejectRepasse = useMutation({
    mutationFn: (serviceRequestId) =>
      base44.entities.ServiceRequest.update(serviceRequestId, {
        payout_processed_at: new Date().toISOString(),
        payment_status: 'rejected',
      }),
    onMutate: (id) => setProcessingId(id),
    onSettled: () => setProcessingId(null),
    onSuccess: () => {
      toast.success('Repasse rejeitado.');
      queryClient.invalidateQueries({ queryKey: ['pending-repasses'] });
    },
    onError: (err) => toast.error('Erro: ' + err.message),
  });

  // CONFIRMAR SAQUE: marca transação como completed
  const confirmWithdrawal = useMutation({
    mutationFn: (transactionId) =>
      base44.entities.WalletTransaction.update(transactionId, { status: 'completed' }),
    onMutate: (id) => setProcessingId(id),
    onSettled: () => setProcessingId(null),
    onSuccess: () => {
      toast.success('Saque confirmado como pago!');
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-withdrawals'] });
    },
    onError: (err) => toast.error('Erro: ' + err.message),
  });

  // ESTORNAR SAQUE: devolve o saldo para a carteira
  const revertWithdrawal = useMutation({
    mutationFn: async ({ transactionId, walletId, amount }) => {
      // Busca saldo atual
      const walls = await base44.entities.Wallet.filter({ id: walletId });
      const w = walls[0];
      if (!w) throw new Error('Carteira não encontrada');
      const newBalance = (w.balance || 0) + amount;
      await base44.entities.Wallet.update(walletId, {
        balance: newBalance,
        total_withdrawn: Math.max(0, (w.total_withdrawn || 0) - amount),
      });
      await base44.entities.WalletTransaction.update(transactionId, { status: 'cancelled' });
    },
    onMutate: ({ transactionId }) => setProcessingId(transactionId),
    onSettled: () => setProcessingId(null),
    onSuccess: () => {
      toast.success('Saque estornado e saldo devolvido!');
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['completed-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallets-for-withdrawals'] });
    },
    onError: (err) => toast.error('Erro ao estornar: ' + err.message),
  });

  const tabs = [
    { id: 'repasses', label: '💸 Repasses', count: pendingRepasses.length },
    { id: 'saques', label: '🏧 Saques PIX', count: pendingWithdrawals.length },
    { id: 'historico', label: '📋 Histórico' },
  ];

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Repasses pendentes', value: pendingRepasses.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Saques aguardando', value: pendingWithdrawals.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          {
            label: 'Volume pendente',
            value: `R$ ${(pendingRepasses.reduce((s, r) => s + (r.final_price || 0) * 0.7, 0) + pendingWithdrawals.reduce((s, t) => s + (t.amount || 0), 0)).toFixed(0)}`,
            color: 'text-primary',
            bg: 'bg-primary/5 border-primary/20',
          },
        ].map(item => (
          <Card key={item.label} className={cn("border", item.bg)}>
            <CardContent className="p-3 text-center">
              <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 bg-destructive text-white text-xs rounded-full px-1.5 py-0.5">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Repasses pendentes */}
      {activeTab === 'repasses' && (
        <div className="space-y-3">
          {loadingRepasses && <p className="text-center text-muted-foreground py-8">Carregando...</p>}
          {!loadingRepasses && pendingRepasses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="font-medium">Nenhum repasse pendente</p>
              <p className="text-sm mt-1">Todos os serviços concluídos foram processados</p>
            </div>
          )}
          {pendingRepasses.map(req => (
            <RepasseCard
              key={req.id}
              request={req}
              onApprove={(id) => approveRepasse.mutate(id)}
              onReject={(id) => rejectRepasse.mutate(id)}
              isProcessing={processingId === req.id}
            />
          ))}
        </div>
      )}

      {/* Saques pendentes */}
      {activeTab === 'saques' && (
        <div className="space-y-3">
          {loadingWithdrawals && <p className="text-center text-muted-foreground py-8">Carregando...</p>}
          {!loadingWithdrawals && pendingWithdrawals.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="font-medium">Nenhum saque pendente</p>
              <p className="text-sm mt-1">Não há solicitações de saque aguardando aprovação</p>
            </div>
          )}
          {pendingWithdrawals.map(tx => (
            <SaqueCard
              key={tx.id}
              transaction={tx}
              wallet={walletMap[tx.wallet_id]}
              onApprove={(id) => confirmWithdrawal.mutate(id)}
              onReject={(id, walletId, amount) => revertWithdrawal.mutate({ transactionId: id, walletId, amount })}
              isProcessing={processingId === tx.id}
            />
          ))}
        </div>
      )}

      {/* Histórico */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Repasses processados</h3>
          {loadingProcessed && <p className="text-center text-muted-foreground py-4">Carregando...</p>}
          {processedRepasses.length === 0 && !loadingProcessed && (
            <p className="text-sm text-muted-foreground">Nenhum repasse processado ainda.</p>
          )}
          <div className="space-y-2">
            {processedRepasses.slice(0, 20).map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm">
                <div>
                  <p className="font-medium">{SERVICE_LABELS[req.service_type] || req.service_type} · {req.provider_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{req.client_name} · {new Date(req.payout_processed_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">R$ {((req.provider_payout_amount || req.final_price * 0.7) || 0).toFixed(2)}</p>
                  <Badge className={cn("text-xs border-0", req.payment_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                    {req.payment_status === 'rejected' ? 'Rejeitado' : 'Processado'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-sm text-foreground pt-2 border-t border-border">Saques concluídos / estornados</h3>
          {historicWithdrawals.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum histórico de saque.</p>
          )}
          <div className="space-y-2">
            {historicWithdrawals.slice(0, 20).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm">
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-700">R$ {(tx.amount || 0).toFixed(2)}</p>
                  <Badge className={cn("text-xs border-0",
                    tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    tx.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {tx.status === 'completed' ? 'Pago' : tx.status === 'cancelled' ? 'Estornado' : tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}