import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Gift, Clock, CheckCircle2, ChevronRight, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Caixa d'Água", desentupimento: "Desentupimento",
  troca_pneu: "Troca Pneu", reboque: "Reboque", outros: "Outros",
};

const NIVEIS = [
  { nivel: 'Iniciante',  minAmigos: 0,  maxAmigos: 9,  bonusPorServico: 2.50, percentTake: 6.9,  emoji: '🌱', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { nivel: 'Pro',        minAmigos: 10, maxAmigos: 19, bonusPorServico: 3.50, percentTake: 9.7,  emoji: '⚡', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { nivel: 'Elite',      minAmigos: 20, maxAmigos: 34, bonusPorServico: 4.50, percentTake: 12.5, emoji: '💎', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { nivel: 'Lendário',   minAmigos: 35, maxAmigos: 49, bonusPorServico: 5.50, percentTake: 15.2, emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { nivel: 'Imperador',  minAmigos: 50, maxAmigos: 70, bonusPorServico: 7.00, percentTake: 19.4, emoji: '👑', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

function getNivel(amigosAtivos) {
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (amigosAtivos >= NIVEIS[i].minAmigos) return NIVEIS[i];
  }
  return NIVEIS[0];
}

export default function CashbackPanel({ userId, ownerType = 'cliente' }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showNiveis, setShowNiveis] = useState(false);

  const { data: cashbacks = [], isLoading } = useQuery({
    queryKey: ['cashbacks', userId, ownerType],
    queryFn: () => base44.entities.Cashback.filter({ owner_id: userId, owner_type: ownerType }, '-created_date', 50),
    enabled: !!userId,
  });

  // Para clientes: busca amigos indicados ativos (referrals confirmadas)
  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals-ativos', userId],
    queryFn: () => base44.entities.Referral.filter({ referrer_id: userId, reward_status: 'confirmada' }),
    enabled: !!userId && ownerType === 'cliente',
  });

  const amigosAtivos = referrals.length;
  const nivelAtual = getNivel(amigosAtivos);
  const proximoNivel = NIVEIS.find(n => n.minAmigos > amigosAtivos);
  const progressoPercent = proximoNivel
    ? Math.min(100, ((amigosAtivos - nivelAtual.minAmigos) / (proximoNivel.minAmigos - nivelAtual.minAmigos)) * 100)
    : 100;

  const available = cashbacks.filter(c => c.status === 'disponivel');
  const used = cashbacks.filter(c => c.status === 'utilizado');
  const totalDisponivel = available.reduce((sum, c) => sum + (c.cashback_amount || 0), 0);
  const totalGanho = cashbacks.reduce((sum, c) => sum + (c.cashback_amount || 0), 0);

  if (isLoading) return (
    <div className="bg-card rounded-3xl p-6 border border-border animate-pulse">
      <div className="h-4 bg-muted rounded w-1/2 mb-3" />
      <div className="h-8 bg-muted rounded w-1/3" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Saldo principal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-3xl p-5 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 opacity-80" />
          <p className="text-sm font-semibold opacity-90">
            {ownerType === 'cliente' ? 'Seu Cashback' : 'Bônus Disponível'}
          </p>
        </div>
        <p className="text-4xl font-bold mb-1">R$ {totalDisponivel.toFixed(2)}</p>
        <p className="text-emerald-100 text-xs">disponível para usar no próximo serviço</p>

        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{available.length}</p>
            <p className="text-xs opacity-80">disponíveis</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">R$ {totalGanho.toFixed(2)}</p>
            <p className="text-xs opacity-80">total ganho</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold">{used.length}</p>
            <p className="text-xs opacity-80">utilizados</p>
          </div>
        </div>
      </motion.div>

      {/* Card de Nível (apenas cliente) */}
      {ownerType === 'cliente' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-3xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{nivelAtual.emoji}</span>
              <div>
                <p className="font-bold text-foreground text-base">{nivelAtual.nivel}</p>
                <p className="text-xs text-muted-foreground">{amigosAtivos} amigo(s) indicado(s) ativo(s)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">R$ {nivelAtual.bonusPorServico.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">+ {nivelAtual.percentTake}% do take</p>
            </div>
          </div>

          {/* Barra de progresso */}
          {proximoNivel && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{amigosAtivos} amigos</span>
                <span>{proximoNivel.minAmigos} para {proximoNivel.emoji} {proximoNivel.nivel}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressoPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          )}
          {!proximoNivel && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-3 py-2 text-xs text-yellow-800 font-semibold text-center mb-3">
              👑 Nível máximo atingido!
            </div>
          )}

          {/* Botão ver todos os níveis */}
          <button
            onClick={() => setShowNiveis(!showNiveis)}
            className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors w-full"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Ver todos os níveis e benefícios
            <ChevronRight className={cn("w-3.5 h-3.5 ml-auto transition-transform", showNiveis && "rotate-90")} />
          </button>

          {/* Tabela de níveis */}
          {showNiveis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 space-y-2"
            >
              <div className="grid grid-cols-4 text-xs text-muted-foreground font-semibold px-1 mb-1">
                <span>Nível</span>
                <span className="text-center">Amigos</span>
                <span className="text-center">Bônus fixo</span>
                <span className="text-center">% take</span>
              </div>
              {NIVEIS.map(n => (
                <div
                  key={n.nivel}
                  className={cn(
                    "grid grid-cols-4 items-center rounded-xl border px-3 py-2 text-xs",
                    n.nivel === nivelAtual.nivel ? n.color + " font-bold" : "bg-muted/40 border-transparent text-muted-foreground"
                  )}
                >
                  <span className="flex items-center gap-1">{n.emoji} {n.nivel}</span>
                  <span className="text-center">{n.minAmigos}–{n.maxAmigos}</span>
                  <span className="text-center">R$ {n.bonusPorServico.toFixed(2)}</span>
                  <span className="text-center">{n.percentTake}%</span>
                </div>
              ))}
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">⚠️ Como funciona o cashback por indicação:</p>
                <p>• Você é bonificado <strong>somente quando o serviço do amigo que você indicou for finalizado</strong> (status: concluído).</p>
                <p>• Indicações pendentes <strong>não geram cashback</strong> até a conclusão do serviço.</p>
                <p>• <Users className="w-3 h-3 inline mr-0.5" />Amigos ativos = amigos indicados que já tiveram ao menos 1 serviço concluído.</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Como funciona (prestador) */}
      {ownerType === 'prestador' && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-600" /> Como ganhar bônus?
          </p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>🏆 Ganhe <strong>R$ 20</strong> a cada 5 serviços concluídos</p>
            <p>⭐ Ganhe <strong>R$ 10</strong> por avaliação ≥ 4,5 estrelas</p>
            <p>💸 Bônus convertidos em crédito para saque</p>
          </div>
        </div>
      )}

      {/* Lista de cashbacks disponíveis */}
      {available.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Disponíveis</p>
          {available.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900 leading-tight">{c.reason}</p>
                <p className="text-xs text-emerald-700 truncate">
                  {SERVICE_LABELS[c.service_type] || c.service_type}
                  {c.expires_at && ` · expira ${new Date(c.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-600 flex-shrink-0">R$ {c.cashback_amount?.toFixed(2)}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Histórico */}
      {used.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Clock className="w-4 h-4" />
            Histórico de utilizados ({used.length})
            <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showHistory && "rotate-90")} />
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {used.map(c => (
                <div key={c.id} className="bg-muted/50 border border-border rounded-2xl p-3 flex items-center gap-3 opacity-70">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.reason}</p>
                    <p className="text-xs text-muted-foreground">{c.used_at ? `Usado em ${new Date(c.used_at).toLocaleDateString('pt-BR')}` : 'Utilizado'}</p>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground flex-shrink-0">R$ {c.cashback_amount?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {cashbacks.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold text-foreground">Nenhum cashback ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            {ownerType === 'cliente'
              ? 'Indique amigos e ganhe cashback quando o serviço deles for concluído!'
              : 'Conclua serviços e receba avaliações altas para ganhar bônus!'}
          </p>
        </div>
      )}
    </div>
  );
}