import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Wallet, Gift, Clock, CheckCircle2, ChevronRight, Users, TrendingUp, Zap, BookOpen, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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
  const [selectedForRedemption, setSelectedForRedemption] = useState([]);

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

  // Para prestadores: busca dados reais de serviços e avaliação
  const { data: provider } = useQuery({
    queryKey: ['provider-cashback-data', userId],
    queryFn: async () => {
      const list = await base44.entities.Provider.filter({ id: userId });
      return list[0] || null;
    },
    enabled: !!userId && ownerType === 'prestador',
  });

  const totalServicos = provider?.total_jobs || 0;
  const mediaAvaliacao = provider?.rating || 0;
  // Blocos de 5 serviços concluídos = bônus
  const blocosCompletos = Math.floor(totalServicos / 5);
  const servicosNoBloco = totalServicos % 5;
  const progressoBloco = (servicosNoBloco / 5) * 100;

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

  const selectedCashbacks = available.filter(c => selectedForRedemption.includes(c.id));
  const selectedTotal = selectedCashbacks.reduce((sum, c) => sum + (c.cashback_amount || 0), 0);

  const redeemMutation = useMutation({
    mutationFn: (redemptionType) =>
      base44.functions.invoke('processCashbackRedemption', {
        cashbackIds: selectedForRedemption,
        redemptionType,
      }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Resgate processado com sucesso!');
      setSelectedForRedemption([]);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg);
    },
  });

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
        <p className="text-emerald-100 text-xs">disponível · resgate PIX a partir de R$ 200,00</p>

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

        {/* Botões de resgate */}
        {(ownerType === 'prestador' && available.length > 0) && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs font-semibold"
              onClick={() => {
                if (selectedTotal < 200) {
                  toast.error(`Mínimo R$ 200,00 para PIX. Você tem R$ ${selectedTotal.toFixed(2)}`);
                  return;
                }
                redeemMutation.mutate('pix');
              }}
              disabled={selectedForRedemption.length === 0 || redeemMutation.isPending}
            >
              <Zap className="w-3 h-3 mr-1" />
              Sacar via PIX
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700"
              onClick={() => redeemMutation.mutate('course')}
              disabled={selectedForRedemption.length === 0 || redeemMutation.isPending}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Cursos (2.5x)
            </Button>
          </div>
        )}
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
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1.5">
                <p className="font-bold">⚠️ Regras do cashback por indicação:</p>
                <p>• O bônus é creditado <strong>somente quando o serviço do amigo indicado for concluído</strong>.</p>
                <p>• Após a conclusão, o valor cai na carteira em até <strong>48 horas</strong>.</p>
                <p>• O resgate via PIX está disponível a partir de <strong>R$ 200,00</strong> acumulados.</p>
                <p>• <Users className="w-3 h-3 inline mr-0.5" />Amigos ativos = indicados com ao menos 1 serviço concluído.</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Opções de resgate (cliente) */}
      {ownerType === 'cliente' && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground mb-2">💰 Opções de Resgate</p>
          <div className="flex gap-2">
            <Button
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              onClick={() => redeemMutation.mutate('service')}
              disabled={selectedForRedemption.length === 0 || redeemMutation.isPending}
            >
              <Gift className="w-3 h-3 mr-1" />
              Usar em serviço
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl text-xs font-semibold"
              onClick={() => {
                if (selectedTotal < 200) {
                  toast.error(`Mínimo R$ 200,00 para PIX. Você tem R$ ${selectedTotal.toFixed(2)}`);
                  return;
                }
                redeemMutation.mutate('pix');
              }}
              disabled={selectedForRedemption.length === 0 || redeemMutation.isPending}
            >
              <Zap className="w-3 h-3 mr-1" />
              Sacar PIX
            </Button>
          </div>
          {selectedTotal > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Total selecionado: <strong>R$ {selectedTotal.toFixed(2)}</strong>
            </p>
          )}
        </div>
      )}

      {/* Regras rápidas (apenas cliente) */}
      {ownerType === 'cliente' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2 text-xs text-blue-800">
          <p className="font-bold text-sm text-blue-900">📋 Como funciona seu cashback</p>
          <p>1️⃣ Indique amigos usando seu código de indicação.</p>
          <p>2️⃣ Quando o serviço do amigo for <strong>concluído</strong>, o bônus é gerado.</p>
          <p>3️⃣ O valor cai na sua carteira após <strong>48 horas</strong> da conclusão do serviço.</p>
          <p>4️⃣ Use como <strong>crédito</strong> no próximo serviço ou acumule <strong>R$ 200,00+</strong> para PIX.</p>
          <p>5️⃣ Quanto mais amigos ativos, maior seu nível e mais cashback por serviço!</p>
          <div className="border-t border-blue-200 pt-2 mt-1">
            <p className="font-semibold mb-1">📊 Tabela de progressão:</p>
            <div className="space-y-1">
              {NIVEIS.map(n => (
                <div key={n.nivel} className="flex items-center justify-between bg-white/60 rounded-lg px-2 py-1">
                  <span>{n.emoji} <strong>{n.nivel}</strong> ({n.minAmigos}–{n.maxAmigos === 70 ? '50+' : n.maxAmigos} amigos)</span>
                  <span className="font-bold text-emerald-700">R$ {n.bonusPorServico.toFixed(2)}/serviço</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progresso e níveis (prestador) */}
      {ownerType === 'prestador' && (
        <div className="space-y-3">
          {/* Card de progresso real */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-3xl p-5 space-y-4"
          >
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Seu Progresso de Bônus
            </p>

            {/* Serviços — bloco de 5 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-foreground">🔧 Serviços concluídos</span>
                <span className="text-xs font-bold text-emerald-700">{totalServicos} total · {blocosCompletos} bônus gerado(s)</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressoBloco}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{servicosNoBloco}/5 no bloco atual</span>
                <span className="font-semibold text-emerald-700">R$ 2,00–5,00 por serviço (por nível)</span>
              </div>
            </div>

            {/* Avaliação */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-foreground">⭐ Avaliação média</span>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  mediaAvaliacao >= 4.5 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                )}>
                  {mediaAvaliacao > 0 ? mediaAvaliacao.toFixed(1) : '—'} ★
                  {mediaAvaliacao >= 4.5 && " · +R$ 10/serviço"}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((mediaAvaliacao / 5) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={cn("h-full rounded-full", mediaAvaliacao >= 4.5 ? "bg-yellow-400" : "bg-muted-foreground/40")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {mediaAvaliacao >= 4.5
                  ? "✅ Você está recebendo bônus de avaliação!"
                  : `Precisa de ${(4.5 - mediaAvaliacao).toFixed(1)} ★ a mais para ganhar bônus de avaliação`}
              </p>
            </div>

            {/* Tabela de níveis */}
            <button
              onClick={() => setShowNiveis(!showNiveis)}
              className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors w-full pt-1 border-t border-border"
            >
              <Users className="w-3.5 h-3.5" />
              Ver tabela de níveis e bônus
              <ChevronRight className={cn("w-3.5 h-3.5 ml-auto transition-transform", showNiveis && "rotate-90")} />
            </button>

            {showNiveis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <div className="grid grid-cols-4 text-xs text-muted-foreground font-semibold px-1 mb-1">
                  <span>Nível</span>
                  <span className="text-center">Serviços</span>
                  <span className="text-center">Estrelas</span>
                  <span className="text-center">Bônus</span>
                </div>
                {[
                  { emoji: '🌱', nivel: 'Iniciante', minJobs: 0,   maxJobs: 119, minRating: 0,  bonus: '—' },
                  { emoji: '⭐', nivel: 'Pro',        minJobs: 120, maxJobs: 159, minRating: 4,  bonus: 'R$ 3,00' },
                  { emoji: '🔥', nivel: 'Pro Plus',   minJobs: 160, maxJobs: 189, minRating: 4,  bonus: 'R$ 3,50' },
                  { emoji: '💎', nivel: 'Pro Elite',  minJobs: 190, maxJobs: 219, minRating: 4,  bonus: 'R$ 4,00' },
                  { emoji: '👑', nivel: 'Pro Lenda',  minJobs: 220, maxJobs: null, minRating: 5, bonus: 'R$ 5,00' },
                ].map(n => {
                  const isAtual = totalServicos >= n.minJobs && (n.maxJobs === null || totalServicos <= n.maxJobs);
                  return (
                    <div
                      key={n.nivel}
                      className={cn(
                        "grid grid-cols-4 items-center rounded-xl border px-3 py-2 text-xs",
                        isAtual ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-900" : "border-transparent bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-1">{n.emoji} {n.nivel}</span>
                      <span className="text-center">{n.minJobs}{n.maxJobs ? `–${n.maxJobs}` : '+'}</span>
                      <span className="text-center">{n.minRating > 0 ? `≥ ${n.minRating}★` : '—'}</span>
                      <span className="text-center text-emerald-700 font-semibold">{n.bonus}</span>
                    </div>
                  );
                })}
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-bold">⚠️ Regras:</p>
                  <p>• Bônus de <strong>R$ 2,00 a R$ 5,00 por serviço concluído</strong> (conforme nível).</p>
                  <p>• Avaliação média <strong>≥ 4,5 ★</strong> gera R$ 10 extra por serviço.</p>
                  <p>• Bônus calculado ao final de cada quinzena.</p>
                  <p>• Resgate via PIX (mín. R$ 200) ou cursos (× 2.5).</p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Opções de resgate */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-2">💰 Opções de Resgate</p>
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-900 flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5" /> PIX Direto
                </p>
                <p className="text-xs text-blue-800">Mínimo: <strong>R$ 200,00</strong> · Valor real · Saque em 2 dias úteis</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <p className="text-xs font-bold text-purple-900 flex items-center gap-2 mb-1">
                  <BookOpen className="w-3.5 h-3.5" /> Cursos Escola Prática
                </p>
                <p className="text-xs text-purple-800">Sem mínimo · <strong>Valor × 2.5</strong> em crédito · Desenvolva suas habilidades!</p>
              </div>
            </div>
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
              onClick={() => {
                if (ownerType === 'prestador') {
                  setSelectedForRedemption(prev =>
                    prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                  );
                }
              }}
              className={cn(
                "bg-emerald-50 border-2 rounded-2xl p-3 flex items-center gap-3 transition-all",
                ownerType === 'prestador' && 'cursor-pointer hover:shadow-md',
                selectedForRedemption.includes(c.id)
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-emerald-200'
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                selectedForRedemption.includes(c.id)
                  ? 'bg-purple-100'
                  : 'bg-emerald-100'
              )}>
                <CheckCircle2 className={cn(
                  "w-5 h-5",
                  selectedForRedemption.includes(c.id)
                    ? 'text-purple-600'
                    : 'text-emerald-600'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold leading-tight",
                  selectedForRedemption.includes(c.id)
                    ? 'text-purple-900'
                    : 'text-emerald-900'
                )}>{c.reason}</p>
                <p className={cn(
                  "text-xs truncate",
                  selectedForRedemption.includes(c.id)
                    ? 'text-purple-700'
                    : 'text-emerald-700'
                )}>
                  {SERVICE_LABELS[c.service_type] || c.service_type}
                  {c.expires_at && ` · expira ${new Date(c.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <p className={cn(
                "text-lg font-bold flex-shrink-0",
                selectedForRedemption.includes(c.id)
                  ? 'text-purple-600'
                  : 'text-emerald-600'
              )}>R$ {c.cashback_amount?.toFixed(2)}</p>
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