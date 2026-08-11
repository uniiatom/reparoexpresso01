import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Zap, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TIER_CONFIG = {
  bronze: { min: 0, color: 'bg-orange-100 text-orange-700', icon: '🥉', points_mult: 1, discount: 0 },
  silver: { min: 500, color: 'bg-slate-100 text-slate-700', icon: '🥈', points_mult: 1.25, discount: 2 },
  gold: { min: 2000, color: 'bg-yellow-100 text-yellow-700', icon: '🥇', points_mult: 1.5, discount: 5 },
  platinum: { min: 5000, color: 'bg-purple-100 text-purple-700', icon: '💎', points_mult: 2, discount: 10 },
};

const calculateTier = (totalPoints) => {
  if (totalPoints >= TIER_CONFIG.platinum.min) return 'platinum';
  if (totalPoints >= TIER_CONFIG.gold.min) return 'gold';
  if (totalPoints >= TIER_CONFIG.silver.min) return 'silver';
  return 'bronze';
};

export default function LoyaltyPanel({ clientId }) {
  const { data: loyalty } = useQuery({
    queryKey: ['customer-loyalty', clientId],
    queryFn: async () => {
      const list = await base44.entities.CustomerLoyalty.filter({ client_id: clientId });
      return list[0];
    },
    enabled: !!clientId,
    staleTime: 60000,
  });

  if (!loyalty) return null;

  const currentTier = loyalty.tier || calculateTier(loyalty.total_points || 0);
  const tierConfig = TIER_CONFIG[currentTier];
  const nextTier = Object.entries(TIER_CONFIG).find(([_, config]) => config.min > (loyalty.total_points || 0));
  const pointsToNextTier = nextTier ? nextTier[1].min - (loyalty.total_points || 0) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header com Tier */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase">Seu Status VIP</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{tierConfig.icon}</span>
                <div>
                  <p className="text-lg font-bold text-foreground capitalize">{currentTier}</p>
                  <p className="text-xs text-muted-foreground">{TIER_CONFIG[currentTier].points_mult}x multiplicador</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{loyalty.available_points || 0}</p>
              <p className="text-xs text-muted-foreground">pontos disponíveis</p>
            </div>
          </div>

          {nextTier && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">
                Faltam {pointsToNextTier} pontos para {nextTier[0].toUpperCase()}
              </p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((loyalty.total_points || 0) / nextTier[1].min) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Pontos Ganhos', value: loyalty.total_points || 0, icon: Zap },
          { label: 'Já Resgatados', value: loyalty.used_points || 0, icon: Gift },
          { label: 'Serviços', value: loyalty.total_services || 0, icon: Award },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                      <p className="font-bold text-sm text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Benefits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> Benefícios do seu Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium text-foreground">Multiplicador de Pontos</span>
            <Badge className="bg-primary/10 text-primary border-0">{TIER_CONFIG[currentTier].points_mult}x</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium text-foreground">Desconto por Tier</span>
            <Badge className="bg-primary/10 text-primary border-0">
              {TIER_CONFIG[currentTier].discount > 0 ? `${TIER_CONFIG[currentTier].discount}%` : 'Nenhum'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">
            {loyalty.available_points >= 100
              ? '✓ Você pode resgatar pontos agora!'
              : `Acumule mais ${100 - (loyalty.available_points || 0)} pontos para resgatar`}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}