import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, ArrowDownRight, ArrowUpRight, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ProviderEarningsWithdrawal({ providerId, providerName }) {
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    pix_key: '',
    pix_key_type: 'cpf',
  });
  const queryClient = useQueryClient();

  // Fetch wallet
  const { data: wallet } = useQuery({
    queryKey: ['provider-wallet', providerId],
    queryFn: () => base44.asServiceRole.entities.Wallet.filter({ owner_id: providerId, owner_type: 'prestador' }).then(w => w[0] || null),
    enabled: !!providerId,
  });

  // Fetch transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['wallet-transactions', providerId],
    queryFn: () => base44.asServiceRole.entities.WalletTransaction.filter({ owner_id: providerId }, '-created_date', 100),
    enabled: !!providerId,
  });

  // Fetch completed services (to show service details)
  const { data: completedServices = [] } = useQuery({
    queryKey: ['completed-services', providerId],
    queryFn: () => base44.asServiceRole.entities.ServiceRequest.filter(
      { provider_id: providerId, status: 'concluido' },
      '-updated_date',
      50
    ),
    enabled: !!providerId,
  });

  // Request withdrawal
  const requestWithdrawal = useMutation({
    mutationFn: (data) => base44.functions.invoke('processWalletWithdrawal', {
      provider_id: providerId,
      amount: parseFloat(data.amount),
      pix_key: data.pix_key,
      pix_key_type: data.pix_key_type,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-wallet', providerId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', providerId] });
      toast.success('Solicitação de saque enviada com sucesso! Será processada em até 2 dias úteis.');
      setShowWithdrawalForm(false);
      setWithdrawalForm({ amount: '', pix_key: '', pix_key_type: 'cpf' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao solicitar saque');
    },
  });

  const handleWithdrawalSubmit = (e) => {
    e.preventDefault();
    if (!withdrawalForm.amount || !withdrawalForm.pix_key) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (parseFloat(withdrawalForm.amount) > (wallet?.balance || 0)) {
      toast.error('Saldo insuficiente');
      return;
    }
    requestWithdrawal.mutate(withdrawalForm);
  };

  const recentRepasses = transactions.filter(t => t.type === 'credit' && t.reference_type === 'service');
  const monthlyEarnings = completedServices.reduce((sum, s) => sum + (s.final_price || 0), 0);

  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!wallet) {
    return (
      <Card className="bg-muted/50 border-border">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm">Carregando dados da carteira...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-green-700 mb-1 font-semibold">SALDO DISPONÍVEL</p>
                  <p className="text-3xl font-bold text-green-700">R$ {wallet.balance.toFixed(2)}</p>
                </div>
                <Wallet className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-700 mb-1 font-semibold">PENDENTE</p>
                  <p className="text-3xl font-bold text-blue-700">R$ {wallet.pending_balance.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
              <p className="text-xs text-blue-600 mt-2">Aguardando liberação de serviços</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-purple-700 mb-1 font-semibold">TOTAL GANHO</p>
                  <p className="text-3xl font-bold text-purple-700">R$ {wallet.total_earned.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Abas: Extrato e Repasses */}
      <Tabs defaultValue="extract" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="extract">Extrato de Serviços</TabsTrigger>
          <TabsTrigger value="repasses">Histórico de Repasses</TabsTrigger>
        </TabsList>

        {/* Extrato de Serviços */}
        <TabsContent value="extract" className="space-y-4">
          {completedServices.length === 0 ? (
            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">Nenhum serviço concluído ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground font-semibold mb-3">
                {completedServices.length} serviço(s) concluído(s) · Total: R$ {monthlyEarnings.toFixed(2)}
              </div>
              {completedServices.map((service, idx) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-border hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">{service.service_type}</h3>
                            <Badge className="bg-green-100 text-green-700 border-0">Concluído</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Cliente: {service.client_name || 'N/A'}</span>
                            <span>•</span>
                            <span>{formatDate(service.updated_date)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground mb-1">Valor recebido</p>
                          <p className="text-xl font-bold text-green-600">R$ {(service.final_price || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Histórico de Repasses */}
        <TabsContent value="repasses" className="space-y-4">
          {recentRepasses.length === 0 ? (
            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">Nenhum repasse registrado ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRepasses.map((repasse, idx) => {
                const isIncome = repasse.type === 'credit';
                return (
                  <motion.div
                    key={repasse.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="border-border">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-3 rounded-2xl ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                              {isIncome ? (
                                <ArrowDownRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground capitalize">{repasse.reference_type}</p>
                              <p className="text-xs text-muted-foreground">{repasse.description || 'Transferência de serviço'}</p>
                              <p className="text-xs text-muted-foreground mt-1">{formatDate(repasse.created_date)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                              {isIncome ? '+' : '-'} R$ {Math.abs(repasse.amount).toFixed(2)}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {repasse.status === 'completed' ? 'Concluído' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Seção de Saque */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Solicitar Saque</CardTitle>
              <CardDescription>Transfira seus ganhos para sua conta bancária via PIX</CardDescription>
            </div>
            {wallet.balance > 0 && (
              <Button
                onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
                className="rounded-2xl"
              >
                {showWithdrawalForm ? 'Cancelar' : 'Novo Saque'}
              </Button>
            )}
          </div>
        </CardHeader>

        {showWithdrawalForm ? (
          <CardContent className="space-y-4">
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Valor a Sacar (R$) *</label>
                <input
                  type="number"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  placeholder="Ex: 100.00"
                  step="0.01"
                  min="0"
                  max={wallet.balance}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">Saldo disponível: R$ {wallet.balance.toFixed(2)}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Tipo de Chave PIX *</label>
                <select
                  value={withdrawalForm.pix_key_type}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, pix_key_type: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">Email</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Chave PIX *</label>
                <input
                  type="text"
                  value={withdrawalForm.pix_key}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, pix_key: e.target.value })}
                  placeholder={`Ex: ${withdrawalForm.pix_key_type === 'cpf' ? '123.456.789-00' : 'sua-chave'}`}
                  className="w-full px-4 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-800">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  O saque será processado em até 2 dias úteis. Verifique se a chave PIX está correta.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowWithdrawalForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={requestWithdrawal.isPending}
                >
                  {requestWithdrawal.isPending ? 'Processando...' : 'Solicitar Saque'}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent>
            {wallet.balance > 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Você tem R$ {wallet.balance.toFixed(2)} disponível</p>
                  <p className="text-xs text-green-600 mt-0.5">Clique em "Novo Saque" para transferir para sua conta</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-700">Saldo insuficiente</p>
                  <p className="text-xs text-yellow-600 mt-0.5">Complete mais serviços para poder solicitar um saque</p>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}