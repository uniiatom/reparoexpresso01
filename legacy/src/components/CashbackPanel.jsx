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
  { nivel: 'Bronze',   minAmigos: 0,  maxAmigos: 9,  bonusPorServico: 2.50, percentTake: 6.9,  medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/beff780b4_e48a41ce-d15e-44b2-8df1-7487b68f1679.jpg',  color: 'bg-amber-50 text-amber-900 border-amber-300' },
  { nivel: 'Prata',    minAmigos: 10, maxAmigos: 19, bonusPorServico: 3.50, percentTake: 9.7,  medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/05ab5e26d_85fcbee0-e8ea-46da-8acc-2123447265f2.jpg',  color: 'bg-slate-100 text-slate-900 border-slate-400' },
  { nivel: 'Ouro',     minAmigos: 20, maxAmigos: 34, bonusPorServico: 4.50, percentTake: 12.5, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/626743952_c309f1db-b2cf-42a1-997f-c1914b668017.jpg',  color: 'bg-yellow-50 text-yellow-900 border-yellow-400' },
  { nivel: 'Diamante', minAmigos: 35, maxAmigos: 49, bonusPorServico: 5.50, percentTake: 15.2, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/986b148d7_5881e20d-7f64-4577-8257-548343ea0eb8.jpg',  color: 'bg-blue-50 text-blue-900 border-blue-400' },
  { nivel: 'Rubi',     minAmigos: 50, maxAmigos: 70, bonusPorServico: 7.00, percentTake: 19.4, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/94c981b4c_ff72e285-f447-4c8f-865e-8987a647a613.jpg',  color: 'bg-red-50 text-red-900 border-red-400' },
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

  // Para prestadores: busca serviços reais concluídos e avaliação
  const { data: providerServicos } = useQuery({
    queryKey: ['provider-cashback-servicos', userId],
    queryFn: async () => {
      const [provList, servicos] = await Promise.all([
        base44.entities.Provider.filter({ id: userId }),
        base44.entities.ServiceRequest.filter({ provider_id: userId, status: 'concluido' }),
      ]);
      const prov = provList[0] || null;
      const withRatings = servicos.filter(s => s.rating_client);
      const avgRating = withRatings.length > 0
        ? withRatings.reduce((sum, s) => sum + s.rating_client, 0) / withRatings.length
        : (prov?.rating || 5);
      return { total: servicos.length, rating: avgRating };
    },
    enabled: !!userId && ownerType === 'prestador',
  });

  const totalServicos = providerServicos?.total || 0;
  const mediaAvaliacao = providerServicos?.rating || 0;
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

      {/* Progresso e níveis (cliente) */}
      {ownerType === 'cliente' && (
        <div className="space-y-3">
          {/* Card de progresso */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-3xl p-5 space-y-4"
          >
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Seu Progresso de Nível
            </p>

            {/* Nível atual com medalha */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={nivelAtual.medal} alt={nivelAtual.nivel} className="w-14 h-14 object-contain drop-shadow-md" />
                <div>
                  <p className="font-black text-foreground text-lg">{nivelAtual.nivel}</p>
                  <p className="text-xs text-muted-foreground">{amigosAtivos} amigo(s) ativo(s)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">R$ {nivelAtual.bonusPorServico.toFixed(2)}/serviço</p>
                <p className="text-xs text-muted-foreground">+{nivelAtual.percentTake}% do take <span className="italic">(% sobre o valor do serviço)</span></p>
              </div>
            </div>

            {/* Barra de progresso de amigos */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-foreground">👥 Amigos indicados ativos</span>
                <span className="text-xs font-bold text-emerald-700">{amigosAtivos} confirmado(s)</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressoPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
              {proximoNivel ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{amigosAtivos}/{proximoNivel.minAmigos} amigos</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    Próximo:
                    <img src={proximoNivel.medal} alt={proximoNivel.nivel} className="w-4 h-4 object-contain" />
                    {proximoNivel.nivel}
                  </span>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-yellow-800 font-semibold text-center">
                  <img src={nivelAtual.medal} alt={nivelAtual.nivel} className="w-5 h-5 object-contain inline mr-1" />
                  Nível máximo atingido!
                </div>
              )}
            </div>

            {/* Tabela de níveis */}
            <button
              onClick={() => setShowNiveis(!showNiveis)}
              className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors w-full pt-1 border-t border-border"
            >
              <Users className="w-3.5 h-3.5" />
              Ver tabela de níveis e benefícios
              <ChevronRight className={cn("w-3.5 h-3.5 ml-auto transition-transform", showNiveis && "rotate-90")} />
            </button>

            {showNiveis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                {NIVEIS.map(n => (
                  <div
                    key={n.nivel}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                      n.nivel === nivelAtual.nivel ? n.color + " font-bold border-2" : "bg-muted/40 border-transparent text-muted-foreground"
                    )}
                  >
                    <img src={n.medal} alt={n.nivel} className="w-8 h-8 object-contain flex-shrink-0" />
                    <span className="w-14 font-semibold">{n.nivel}</span>
                    <span className="flex-1 text-center">{n.minAmigos}–{n.maxAmigos} amigos</span>
                    <span className="text-center">R$ {n.bonusPorServico.toFixed(2)}</span>
                    <span className="text-right">{n.percentTake}%</span>
                  </div>
                ))}
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-bold">⚠️ Regras do cashback por indicação:</p>
                  <p>• O bônus é creditado <strong>somente quando o serviço do amigo indicado for concluído</strong>.</p>
                  <p>• Após a conclusão, o valor cai na carteira em até <strong>48 horas</strong>.</p>
                  <p>• O resgate via PIX está disponível a partir de <strong>R$ 200,00</strong> acumulados.</p>
                  <p>• <Users className="w-3 h-3 inline mr-0.5" />Amigos ativos = indicados com ao menos 1 serviço concluído.</p>
                  <p>• O <strong>% do take</strong> é um percentual calculado sobre o <strong>valor total do serviço</strong> contratado pelo amigo indicado. Ex: se o serviço custou R$ 200 e você está no nível Bronze (6,9%), você ganha R$ 13,80 de cashback desse serviço.</p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Opções de resgate */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-2">💰 Opções de Resgate</p>
            <div className="space-y-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-2 mb-1">
                  <Gift className="w-3.5 h-3.5" /> Usar em Serviço
                </p>
                <p className="text-xs text-emerald-800">Sem mínimo · Desconto direto na próxima OS</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-900 flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5" /> PIX Direto
                </p>
                <p className="text-xs text-blue-800">Mínimo: <strong>R$ 200,00</strong> · Saque em 2 dias úteis</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
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
              <p className="text-xs text-muted-foreground text-center mt-2">
                Total selecionado: <strong>R$ {selectedTotal.toFixed(2)}</strong>
              </p>
            )}
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