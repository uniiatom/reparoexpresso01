import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Star, Zap, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const NIVEIS = [
  {
    nivel: 'Bronze',   minJobs: 0,   maxJobs: 119,  minRating: null, bonus: 0,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/beff780b4_e48a41ce-d15e-44b2-8df1-7487b68f1679.jpg',
    color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900',
  },
  {
    nivel: 'Prata',    minJobs: 120, maxJobs: 159,  minRating: 4.0, bonus: 3.00,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/05ab5e26d_85fcbee0-e8ea-46da-8acc-2123447265f2.jpg',
    color: 'from-slate-400 to-slate-500', bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-800',
  },
  {
    nivel: 'Ouro',     minJobs: 160, maxJobs: 189,  minRating: 4.0, bonus: 3.50,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/626743952_c309f1db-b2cf-42a1-997f-c1914b668017.jpg',
    color: 'from-yellow-400 to-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900',
  },
  {
    nivel: 'Diamante', minJobs: 190, maxJobs: 219,  minRating: 4.0, bonus: 4.00,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/986b148d7_5881e20d-7f64-4577-8257-548343ea0eb8.jpg',
    color: 'from-cyan-400 to-blue-500', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900',
  },
  {
    nivel: 'Rubi',     minJobs: 220, maxJobs: null, minRating: 4.5, bonus: 5.00,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/94c981b4c_ff72e285-f447-4c8f-865e-8987a647a613.jpg',
    color: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900',
  },
];

function getNivelAtual(jobs, rating) {
  let current = NIVEIS[0];
  for (const n of NIVEIS) {
    const okJobs = jobs >= n.minJobs;
    const okRating = n.minRating === null || rating >= n.minRating;
    if (okJobs && okRating) current = n;
  }
  return current;
}

export default function ProviderLevelProgress({ providerId }) {
  const { data: provider } = useQuery({
    queryKey: ['provider-level-progress', providerId],
    queryFn: async () => {
      const list = await base44.entities.Provider.filter({ id: providerId });
      return list[0] || null;
    },
    enabled: !!providerId,
  });

  if (!provider) return null;

  const totalJobs = provider.total_jobs || 0;
  const rating = provider.rating || 0;
  const nivelAtual = getNivelAtual(totalJobs, rating);
  const idxAtual = NIVEIS.findIndex(n => n.nivel === nivelAtual.nivel);
  const proximoNivel = NIVEIS[idxAtual + 1] || null;

  // Progresso até próximo nível (por serviços)
  const progressoJobs = proximoNivel
    ? Math.min(100, ((totalJobs - nivelAtual.minJobs) / (proximoNivel.minJobs - nivelAtual.minJobs)) * 100)
    : 100;
  const faltamJobs = proximoNivel ? Math.max(0, proximoNivel.minJobs - totalJobs) : 0;

  // Progresso de avaliação para o próximo nível
  const ratingAlvo = proximoNivel?.minRating || nivelAtual.minRating || 4.0;
  const progressoRating = Math.min(100, (rating / ratingAlvo) * 100);
  const faltamStars = proximoNivel?.minRating ? Math.max(0, proximoNivel.minRating - rating) : 0;

  // Ganho extra mensal ao subir de nível (55 serv/sem × 4.33 sem/mês × 90% conclusão)
  const servicosMes = Math.round(55 * 4.33 * 0.9);
  const ganhoAtual = nivelAtual.bonus * servicosMes;
  const ganhoProximo = proximoNivel ? proximoNivel.bonus * servicosMes : ganhoAtual;
  const ganhoExtra = ganhoProximo - ganhoAtual;

  return (
    <div className="space-y-4">
      {/* Header — nível atual */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-3xl p-5 border-2", nivelAtual.bg, nivelAtual.border)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={nivelAtual.medal} alt={nivelAtual.nivel} className="w-14 h-14 object-contain drop-shadow-md" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nível Atual</p>
              <p className={cn("text-2xl font-black", nivelAtual.text)}>{nivelAtual.nivel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">bônus/serviço</p>
            <p className={cn("text-xl font-black", nivelAtual.text)}>
              {nivelAtual.bonus > 0 ? `R$ ${nivelAtual.bonus.toFixed(2)}` : '—'}
            </p>
            {nivelAtual.bonus > 0 && (
              <p className="text-xs text-muted-foreground">≈ R$ {ganhoAtual.toFixed(0)}/mês</p>
            )}
          </div>
        </div>

        {/* Stats do nível atual */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/60 rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-foreground">{totalJobs}</p>
            <p className="text-xs text-muted-foreground">serviços concluídos</p>
          </div>
          <div className="bg-white/60 rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-foreground">{rating > 0 ? rating.toFixed(1) : '—'} ★</p>
            <p className="text-xs text-muted-foreground">avaliação média</p>
          </div>
        </div>
      </motion.div>

      {/* Progresso até próximo nível */}
      {proximoNivel ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Próximo: {proximoNivel.nivel}</p>
            </div>
            <div className="flex items-center gap-2">
              <img src={proximoNivel.medal} alt={proximoNivel.nivel} className="w-8 h-8 object-contain" />
              {ganhoExtra > 0 && (
                <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                  +R$ {ganhoExtra.toFixed(0)}/mês
                </span>
              )}
            </div>
          </div>

          {/* Barra de serviços */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" /> Serviços
              </span>
              <span className={cn(
                "text-xs font-bold",
                faltamJobs === 0 ? "text-emerald-600" : "text-muted-foreground"
              )}>
                {totalJobs} / {proximoNivel.minJobs}
                {faltamJobs === 0 ? ' ✓' : ` · faltam ${faltamJobs}`}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressoJobs}%` }}
                transition={{ duration: 0.8 }}
                className={cn("h-full rounded-full bg-gradient-to-r", proximoNivel.color)}
              />
            </div>
          </div>

          {/* Barra de avaliação */}
          {proximoNivel.minRating && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" /> Avaliação mínima
                </span>
                <span className={cn(
                  "text-xs font-bold",
                  faltamStars === 0 ? "text-emerald-600" : "text-orange-600"
                )}>
                  {rating > 0 ? rating.toFixed(1) : '—'} / {proximoNivel.minRating.toFixed(1)} ★
                  {faltamStars === 0 ? ' ✓' : ` · faltam ${faltamStars.toFixed(1)}★`}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressoRating}%` }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                />
              </div>
            </div>
          )}

          {/* Status geral */}
          {faltamJobs === 0 && faltamStars === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs font-bold text-emerald-800">
                🎉 Você já atingiu os requisitos para {proximoNivel.nivel}! A mudança ocorre ao final da quinzena.
              </p>
            </div>
          ) : (
            <div className="bg-muted/40 rounded-2xl p-3 text-xs text-muted-foreground space-y-0.5">
              <p className="font-semibold text-foreground mb-1">Para subir para {proximoNivel.nivel}:</p>
              {faltamJobs > 0 && <p>• Complete mais <strong>{faltamJobs} serviço(s)</strong></p>}
              {faltamStars > 0 && <p>• Eleve sua avaliação em <strong>{faltamStars.toFixed(1)} ★</strong></p>}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border-2 border-red-300 bg-red-50 p-5 text-center"
        >
          <p className="text-2xl mb-1">👑</p>
          <p className="font-black text-red-900 text-lg">Nível Máximo Atingido!</p>
          <p className="text-xs text-red-700 mt-1">Você está no topo — continue mantendo sua excelência!</p>
        </motion.div>
      )}

      {/* Mapa de todos os níveis */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-border bg-card p-5"
      >
        <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> Jornada de Níveis
        </p>
        <div className="relative">
          {/* Linha de progresso vertical */}
          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />
          <div className="space-y-3">
            {NIVEIS.map((n, idx) => {
              const desbloqueado = totalJobs >= n.minJobs && (n.minRating === null || rating >= n.minRating);
              const isAtual = n.nivel === nivelAtual.nivel;
              return (
                <div key={n.nivel} className="flex gap-3 items-center relative">
                  {/* Indicador */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all",
                    isAtual ? `bg-gradient-to-br ${n.color} border-transparent` :
                    desbloqueado ? 'bg-emerald-100 border-emerald-400' : 'bg-card border-border'
                  )}>
                    {isAtual ? (
                      <img src={n.medal} alt={n.nivel} className="w-7 h-7 object-contain" />
                    ) : desbloqueado ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className={cn(
                    "flex-1 rounded-2xl px-3 py-2 border transition-all",
                    isAtual ? `${n.bg} ${n.border} border-2` : 'border-border bg-muted/20'
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-black", isAtual ? n.text : desbloqueado ? 'text-foreground' : 'text-muted-foreground')}>
                          {n.nivel}
                        </span>
                        {isAtual && <span className="text-[10px] font-bold bg-white/60 px-1.5 py-0.5 rounded-full text-foreground">atual</span>}
                      </div>
                      <span className={cn("text-xs font-bold", isAtual ? n.text : desbloqueado ? 'text-emerald-600' : 'text-muted-foreground')}>
                        {n.bonus > 0 ? `R$ ${n.bonus.toFixed(2)}/serv` : '—'}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{n.minJobs}{n.maxJobs ? `–${n.maxJobs}` : '+'} serv.</span>
                      {n.minRating && <span>· ≥ {n.minRating.toFixed(1)} ★</span>}
                      {n.bonus > 0 && <span>· ≈ R$ {(n.bonus * servicosMes).toFixed(0)}/mês</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          * Estimativa mensal baseada em 55 serv/sem · 90% conclusão. Mudanças de nível ao final de cada quinzena.
        </p>
      </motion.div>
    </div>
  );
}