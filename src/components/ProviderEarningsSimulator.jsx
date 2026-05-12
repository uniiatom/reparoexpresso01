import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Zap, Star, Target, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const NIVEIS = [
  { nivel: 'Bronze',   minJobs: 0,   bonus: 0,    ratingBonus: 0,    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/beff780b4_e48a41ce-d15e-44b2-8df1-7487b68f1679.jpg',  color: 'from-amber-500 to-amber-600'   },
  { nivel: 'Prata',    minJobs: 120, bonus: 3.00, ratingBonus: 5.00, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/05ab5e26d_85fcbee0-e8ea-46da-8acc-2123447265f2.jpg',  color: 'from-slate-400 to-slate-500'   },
  { nivel: 'Ouro',     minJobs: 160, bonus: 3.50, ratingBonus: 7.50, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/626743952_c309f1db-b2cf-42a1-997f-c1914b668017.jpg',  color: 'from-yellow-400 to-yellow-500' },
  { nivel: 'Diamante', minJobs: 190, bonus: 4.00, ratingBonus: 10.0, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/986b148d7_5881e20d-7f64-4577-8257-548343ea0eb8.jpg',  color: 'from-cyan-400 to-blue-500'     },
  { nivel: 'Rubi',     minJobs: 220, bonus: 5.00, ratingBonus: 10.0, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/94c981b4c_ff72e285-f447-4c8f-865e-8987a647a613.jpg',  color: 'from-red-500 to-rose-600'      },
];

// Parâmetros reais da operação
// Seg–Sex: 8h–20h (12h), Sáb: 8h–16h (8h)
// 55 serviços por semana, ticket médio R$ 63,00
const TICKET_MEDIO = 63;
const SERVICOS_SEMANA_PADRAO = 55;
// Semanas por mês = 4.33
const SEMANAS_MES = 4.33;

function getNivel(totalJobs) {
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (totalJobs >= NIVEIS[i].minJobs) return NIVEIS[i];
  }
  return NIVEIS[0];
}

function getProximoNivel(totalJobs) {
  return NIVEIS.find(n => n.minJobs > totalJobs) || null;
}

export default function ProviderEarningsSimulator({ totalJobsCompleted = 0, averageRating = 5 }) {
  // Slider de serviços por semana (baseado na realidade: 55/semana)
  const [servicosPorSemana, setServicosPorSemana] = useState(SERVICOS_SEMANA_PADRAO);
  const [taxaConclusao, setTaxaConclusao] = useState(90);
  const [expanded, setExpanded] = useState(false);

  const nivelAtual = getNivel(totalJobsCompleted);
  const proximoNivel = getProximoNivel(totalJobsCompleted);

  const calc = useMemo(() => {
    const servicosBrutosMes = servicosPorSemana * SEMANAS_MES;
    const servicosConcluidos = Math.round(servicosBrutosMes * (taxaConclusao / 100));

    const repasse = servicosConcluidos * TICKET_MEDIO;
    const bonusCashback = servicosConcluidos * nivelAtual.bonus;
    const bonusAvaliacao = averageRating >= 4.5 ? servicosConcluidos * nivelAtual.ratingBonus : 0;
    const total = repasse + bonusCashback + bonusAvaliacao;

    // Projeção com próximo nível
    let totalProximo = null;
    if (proximoNivel) {
      const bonusProximo = servicosConcluidos * proximoNivel.bonus;
      const bonusAvaliacaoProximo = averageRating >= 4.5 ? servicosConcluidos * proximoNivel.ratingBonus : 0;
      totalProximo = repasse + bonusProximo + bonusAvaliacaoProximo;
    }

    return { servicosConcluidos, repasse, bonusCashback, bonusAvaliacao, total, totalProximo };
  }, [servicosPorSemana, taxaConclusao, nivelAtual, proximoNivel, averageRating]);

  const diffProximo = calc.totalProximo ? calc.totalProximo - calc.total : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden border border-border shadow-lg"
    >
      {/* Header gradiente */}
      <div className={cn("bg-gradient-to-r p-5 text-white", nivelAtual.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={nivelAtual.medal} alt={nivelAtual.nivel} className="w-12 h-12 object-contain drop-shadow-lg" />
            <div>
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Simulador de Ganhos</p>
              <p className="text-xl font-black">Nível {nivelAtual.nivel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">estimativa mensal</p>
            <motion.p
              key={calc.total}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-black"
            >
              R$ {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </motion.p>
          </div>
        </div>

        {/* Info do horário real */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1 text-xs font-semibold">
            <Clock className="w-3 h-3" /> Seg–Sex 8h–20h
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1 text-xs font-semibold">
            <Calendar className="w-3 h-3" /> Sáb 8h–16h
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1 text-xs font-semibold">
            <Zap className="w-3 h-3" /> Ticket R$ {TICKET_MEDIO}
          </div>
        </div>

        {/* Motivação próximo nível */}
        {proximoNivel && diffProximo > 0 && (
          <div className="mt-3 bg-white/20 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <img src={proximoNivel.medal} alt={proximoNivel.nivel} className="w-5 h-5 object-contain" />
              <p className="text-xs font-bold">No nível {proximoNivel.nivel} você ganharia <span className="text-white font-black">+R$ {diffProximo.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês</span></p>
            </div>
            <p className="text-xs opacity-75">Faltam {proximoNivel.minJobs - totalJobsCompleted} serviços para subir de nível</p>
          </div>
        )}
        {!proximoNivel && (
          <div className="mt-3 bg-white/20 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold">👑 Você está no nível máximo! Maximize seus ganhos!</p>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="bg-card p-5 space-y-5">

        {/* Slider: serviços por semana */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> Serviços por semana
            </label>
            <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{servicosPorSemana}</span>
          </div>
          <Slider
            min={10} max={80} step={5}
            value={[servicosPorSemana]}
            onValueChange={([v]) => setServicosPorSemana(v)}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>10 (baixo)</span><span>55 (padrão)</span><span>80 (alto)</span>
          </div>
        </div>

        {/* Slider: taxa de conclusão */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-primary" /> Taxa de conclusão
            </label>
            <span className={cn(
              "text-sm font-black px-2 py-0.5 rounded-lg",
              taxaConclusao >= 80 ? "text-emerald-700 bg-emerald-100" : taxaConclusao >= 60 ? "text-yellow-700 bg-yellow-100" : "text-red-700 bg-red-100"
            )}>{taxaConclusao}%</span>
          </div>
          <Slider
            min={30} max={100} step={5}
            value={[taxaConclusao]}
            onValueChange={([v]) => setTaxaConclusao(v)}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>30% (baixo)</span><span>70% (médio)</span><span>100%</span>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Serv./mês', value: calc.servicosConcluidos },
            { label: 'Repasse', value: `R$ ${calc.repasse.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
            { label: 'Bônus', value: `R$ ${(calc.bonusCashback + calc.bonusAvaliacao).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
          ].map((item, i) => (
            <div key={i} className="bg-muted/50 rounded-xl p-2.5 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-black text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Detalhamento */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-primary hover:text-primary/80 transition-colors pt-3 border-t border-border"
        >
          <span>Ver detalhamento da estimativa</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {[
                { label: `${calc.servicosConcluidos} serviços × R$ ${TICKET_MEDIO} (ticket médio)`, value: calc.repasse, color: 'text-foreground' },
                { label: `Bônus cashback (R$ ${nivelAtual.bonus.toFixed(2)}/serviço)`, value: calc.bonusCashback, color: 'text-emerald-600' },
                { label: averageRating >= 4.5 ? `Bônus avaliação ≥ 4.5★ (R$ ${nivelAtual.ratingBonus.toFixed(2)}/serviço)` : 'Bônus avaliação (requer ≥ 4.5★)', value: calc.bonusAvaliacao, color: averageRating >= 4.5 ? 'text-yellow-600' : 'text-muted-foreground', muted: averageRating < 4.5 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-muted/40 rounded-xl px-3 py-2">
                  <span className={cn("text-muted-foreground", item.muted && "line-through opacity-50")}>{item.label}</span>
                  <span className={cn("font-bold", item.color, item.muted && "opacity-40")}>
                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm bg-primary/10 rounded-xl px-3 py-2 font-black">
                <span className="text-primary">Total estimado / mês</span>
                <span className="text-primary">R$ {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                * Seg–Sex 8h–20h · Sáb 8h–16h · {servicosPorSemana} serv/sem · ticket R$ {TICKET_MEDIO}. Valores podem variar.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}