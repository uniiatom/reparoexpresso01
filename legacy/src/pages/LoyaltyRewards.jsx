import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gift, TrendingUp, Zap, Award, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

const REWARD_TIERS = [
  { points: 100, discount: 10, label: 'R$ 10 de desconto', popular: false },
  { points: 250, discount: 30, label: 'R$ 30 de desconto', popular: false },
  { points: 500, discount: 70, label: 'R$ 70 de desconto', popular: true },
  { points: 1000, discount: 160, label: 'R$ 160 de desconto', popular: false },
];

export default function LoyaltyRewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReward, setSelectedReward] = useState(null);

  const { data: loyalty } = useQuery({
    queryKey: ['customer-loyalty', user?.id],
    queryFn: async () => {
      const list = await base44.entities.CustomerLoyalty.filter({ client_id: user.id });
      return list[0];
    },
    enabled: !!user?.id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['loyalty-transactions', user?.id],
    queryFn: () => base44.entities.LoyaltyTransaction.filter({ client_id: user.id }, '-created_date', 20),
    enabled: !!user?.id,
  });

  const redeemMutation = useMutation({
    mutationFn: async (points) => {
      const reward = REWARD_TIERS.find(r => r.points === points);
      if (!loyalty || loyalty.available_points < points) {
        throw new Error('Pontos insuficientes');
      }

      const newAvailable = (loyalty.available_points || 0) - points;
      const newUsed = (loyalty.used_points || 0) + points;

      await base44.entities.CustomerLoyalty.update(loyalty.id, {
        available_points: newAvailable,
        used_points: newUsed,
      });

      await base44.entities.LoyaltyTransaction.create({
        client_id: user.id,
        type: 'used',
        points,
        description: `Resgate de ${reward.label}`,
        reference_type: 'payment',
        balance_after: newAvailable,
      });

      return reward;
    },
    onSuccess: (reward) => {
      queryClient.invalidateQueries({ queryKey: ['customer-loyalty'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      toast.success(`🎉 ${reward.label} gerado com sucesso!`);
      setSelectedReward(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao resgatar pontos');
    },
  });

  if (!loyalty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Carregando dados de fidelidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Programa de Fidelidade</h1>
      </div>

      {/* Saldo Principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl p-6 mb-6 shadow-lg"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-primary-foreground/80 text-sm font-semibold mb-1">Seu Saldo</p>
            <p className="text-4xl font-bold">{loyalty.available_points || 0}</p>
            <p className="text-primary-foreground/70 text-sm mt-1">pontos disponíveis</p>
          </div>
          <Zap className="w-12 h-12 opacity-30" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Ganhos', value: loyalty.total_points || 0 },
            { label: 'Resgatados', value: loyalty.used_points || 0 },
            { label: 'Serviços', value: loyalty.total_services || 0 },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-xs opacity-80">{stat.label}</p>
              <p className="font-bold text-lg">{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Resgate de Recompensas */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" /> Resgate Recompensas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REWARD_TIERS.map((reward, idx) => (
            <motion.div
              key={reward.points}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                className={cn(
                  'cursor-pointer transition-all border-2',
                  selectedReward?.points === reward.points
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                  (loyalty.available_points || 0) < reward.points && 'opacity-50'
                )}
                onClick={() => (loyalty.available_points || 0) >= reward.points && setSelectedReward(reward)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{reward.label}</p>
                        {reward.popular && (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">Popular</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {reward.points} pontos
                      </p>
                    </div>
                    {(loyalty.available_points || 0) >= reward.points ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <span className="text-xs text-destructive">Faltam {reward.points - (loyalty.available_points || 0)}</span>
                    )}
                  </div>

                  {selectedReward?.points === reward.points && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        redeemMutation.mutate(reward.points);
                      }}
                      disabled={redeemMutation.isPending}
                      className="w-full mt-3 rounded-lg h-10"
                    >
                      {redeemMutation.isPending ? 'Resgatando...' : 'Confirmar Resgate'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Histórico de Transações */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Histórico de Pontos
        </h2>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const icons = {
                earned: '✅',
                used: '💳',
                expired: '⏰',
                bonus: '🎁',
              };
              const colors = {
                earned: 'text-green-600 bg-green-50',
                used: 'text-orange-600 bg-orange-50',
                expired: 'text-red-600 bg-red-50',
                bonus: 'text-blue-600 bg-blue-50',
              };
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn('flex items-start gap-3 p-3 rounded-lg border border-border', colors[tx.type])}
                >
                  <span className="text-lg flex-shrink-0">{icons[tx.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{tx.description}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {new Date(tx.created_date).toLocaleDateString('pt-BR', {
                        day: 'short',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('font-bold', tx.type === 'earned' || tx.type === 'bonus' ? 'text-green-600' : 'text-red-600')}>
                      {tx.type === 'earned' || tx.type === 'bonus' ? '+' : '-'}{tx.points}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">Nenhuma transação ainda</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Como Ganhar Pontos */}
      <Card className="mt-8 bg-accent/50 border-accent">
        <CardHeader>
          <CardTitle className="text-sm">💡 Como Ganhar Pontos?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground space-y-1">
          <p>✓ Ganhe 1 ponto a cada R$ 1,00 gasto em serviços</p>
          <p>✓ Seu multiplicador aumenta com o tier de fidelidade</p>
          <p>✓ Bônus especiais em datas comemorativas e referências</p>
          <p>✓ Pontos acumulam por 12 meses</p>
        </CardContent>
      </Card>
    </div>
  );
}