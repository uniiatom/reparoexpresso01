import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Zap, Star, ChevronDown, ChevronUp, Clock, Calendar, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const NIVEIS = [
  { nivel: 'Bronze',   minJobs: 0,   bonus: 0,    ratingBonus: 0,    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/beff780b4_e48a41ce-d15e-44b2-8df1-7487b68f1679.jpg',  color: 'from-amber-500 to-amber-600'   },
  { nivel: 'Prata',    minJobs: 120, bonus: 3.00, ratingBonus: 5.00, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/05ab5e26d_85fcbee0-e8ea-46da-8acc-2123447265f2.jpg',  color: 'from-slate-400 to-slate-500'   },
  { nivel: 'Ouro',     minJobs: 160, bonus: 3.50, ratingBonus: 7.50, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/626743952_c309f1db-b2cf-42a1-997f-c1914b668017.jpg',  color: 'from-yellow-400 to-yellow-500' },
  { nivel: 'Diamante', minJobs: 190, bonus: 4.00, ratingBonus: 10.0, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/986b148d7_5881e20d-7f64-4577-8257-548343ea0eb8.jpg',  color: 'from-cyan-400 to-blue-500'     },
  { nivel: 'Rubi',     minJobs: 220, bonus: 5.00, ratingBonus: 10.0, medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/94c981b4c_ff72e285-f447-4c8f-865e-8987a647a613.jpg',  color: 'from-red-500 to-rose-600'      },
];

const TICKET_MEDIO = 63;
const SEMANAS_MES = 4.33;

// Distribuição de serviços por faixa horária (seg-sex 8h-20h, sab 8h-16h, 55 serv/sem)
// Seg-Sex: 8h-18h = horário normal (10h), 18h-20h = +30% (2h)
// Sáb: 8h-14h = normal (6h), 14h-18h = +30% (4h -- mas operação vai até 16h, então 14h-16h = +30%)
// Operação real: Seg-Sex 8-20h, Sáb 8-16h
// Horas produtivas/semana: 5*12 + 8 = 68h
// Distribuição aproximada de serviços (55/sem):
//   Seg-Sex 8-18h:  10h/dia × 5 = 50h → 50/68 ≈ 73.5% → ~40 serv
//   Seg-Sex 18-20h: 2h/dia × 5 = 10h  → 10/68 ≈ 14.7% → ~8 serv
//   Sáb 8-14h:      6h       = 6h      → 6/68  ≈  8.8% → ~5 serv
//   Sáb 14-16h:     2h       = 2h      → 2/68  ≈  2.9% → ~2 serv
// Proporções fixas (somam 1):
const DIST = {
  segSexNormal:  50 / 68,  // 8h-18h seg-sex: sem acréscimo
  segSexNoite1:  10 / 68,  // 18h-20h seg-sex: +30%
  sabNormal:      6 / 68,  // 8h-14h sáb: sem acréscimo
  sabTarde:       2 / 68,  // 14h-16h sáb: +30%
};

function getNivel(totalJobs) {
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (totalJobs >= NIVEIS[i].minJobs) return NIVEIS[i];
  }
  return NIVEIS[0];
}

function getProximoNivel(totalJobs) {
  return NIVEIS.find(n => n.minJobs > totalJobs) || null;
}

// Calcula ticket médio ponderado com acréscimos
function calcTicketComAdicional(servicosConcluidos, comDomingo, comFeriado) {
  // Proporção base para seg-sex + sáb
  const fatorBase =
    DIST.segSexNormal * 1.0 +
    DIST.segSexNoite1 * 1.30 +
    DIST.sabNormal    * 1.0 +
    DIST.sabTarde     * 1.30;

  // Domingos: ~4.33 domingos/mês, estimamos ~8 serviços/domingo se habilitado
  const servicosDomingo = comDomingo ? 8 * SEMANAS_MES : 0;
  // Feriados: estimativa 2 feriados/mês × ~8 serviços
  const servicosFeriado = comFeriado ? 2 * 8 : 0;

  const totalServBase = servicosConcluidos;
  const totalGeral = totalServBase + servicosDomingo + servicosFeriado;

  if (totalGeral === 0) return { repasse: 0, detalhe: [] };

  const repasseBase = servicosConcluidos * TICKET_MEDIO * fatorBase;
  const repasseDomingo = servicosDomingo * TICKET_MEDIO * 1.70;
  const repasseFeriado = servicosFeriado * TICKET_MEDIO * 1.70;

  const detalhe = [
    { label: 'Seg–Sex 8h–18h (normal)',   servs: Math.round(servicosConcluidos * DIST.segSexNormal), fator: 1.00 },
    { label: 'Seg–Sex 18h–20h (+30%)',    servs: Math.round(servicosConcluidos * DIST.segSexNoite1), fator: 1.30 },
    { label: 'Sáb 8h–14h (normal)',       servs: Math.round(servicosConcluidos * DIST.sabNormal),    fator: 1.00 },
    { label: 'Sáb 14h–16h (+30%)',        servs: Math.round(servicosConcluidos * DIST.sabTarde),     fator: 1.30 },
    ...(comDomingo ? [{ label: `Domingos (+70%) ~${Math.round(servicosDomingo)} serv/mês`, servs: Math.round(servicosDomingo), fator: 1.70 }] : []),
    ...(comFeriado ? [{ label: `Feriados (+70%) ~${Math.round(servicosFeriado)} serv/mês`, servs: Math.round(servicosFeriado), fator: 1.70 }] : []),
  ];

  return {
    repasse: repasseBase + repasseDomingo + repasseFeriado,
    totalServicos: Math.round(totalGeral),
    detalhe,
  };
}

export default function ProviderEarningsSimulator({ totalJobsCompleted = 0, averageRating = 5 }) {
  const [servicosPorSemana, setServicosPorSemana] = useState(55);
  const [taxaConclusao, setTaxaConclusao] = useState(90);
  const [comDomingo, setComDomingo] = useState(false);
  const [comFeriado, setComFeriado] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const nivelAtual = getNivel(totalJobsCompleted);
  const proximoNivel = getProximoNivel(totalJobsCompleted);

  const calc = useMemo(() => {
    const servicosBrutosMes = servicosPorSemana * SEMANAS_MES;
    const servicosConcluidos = Math.round(servicosBrutosMes * (taxaConclusao / 100));

    const { repasse, totalServicos, detalhe } = calcTicketComAdicional(servicosConcluidos, comDomingo, comFeriado);
    const totalServ = totalServicos || servicosConcluidos;

    const bonusCashback = totalServ * nivelAtual.bonus;
    const bonusAvaliacao = averageRating >= 4.5 ? totalServ * nivelAtual.ratingBonus : 0;
    const total = repasse + bonusCashback + bonusAvaliacao;

    let totalProximo = null;
    if (proximoNivel) {
      const bonusProximo = totalServ * proximoNivel.bonus;
      const bonusAvaliacaoProximo = averageRating >= 4.5 ? totalServ * proximoNivel.ratingBonus : 0;
      totalProximo = repasse + bonusProximo + bonusAvaliacaoProximo;
    }

    return { servicosConcluidos, totalServicos: totalServ, repasse, bonusCashback, bonusAvaliacao, total, totalProximo, detalhe: detalhe || [] };
  }, [servicosPorSemana, taxaConclusao, comDomingo, comFeriado, nivelAtual, proximoNivel, averageRating]);

  const diffProximo = calc.totalProximo ? calc.totalProximo - calc.total : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden border border-border shadow-lg"
    >
      {/* Header */}
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
              key={Math.round(calc.total)}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-black"
            >
              R$ {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </motion.p>
          </div>
        </div>

        {/* Badges de horário */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1 text-xs font-semibold">
            <Sun className="w-3 h-3" /> Seg–Sex 8h–20h
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1 text-xs font-semibold">
            <Calendar className="w-3 h-3" /> Sáb 8h–16h
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-2.5 py-1 text-xs font-semibold">
            <Zap className="w-3 h-3" /> Ticket R$ {TICKET_MEDIO}
          </div>
        </div>

        {proximoNivel && diffProximo > 0 && (
          <div className="mt-3 bg-white/20 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <img src={proximoNivel.medal} alt={proximoNivel.nivel} className="w-5 h-5 object-contain" />
              <p className="text-xs font-bold">No nível {proximoNivel.nivel} você ganharia <span className="font-black">+R$ {diffProximo.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês</span></p>
            </div>
            <p className="text-xs opacity-75">Faltam {proximoNivel.minJobs - totalJobsCompleted} serviços para subir de nível</p>
          </div>
        )}
        {!proximoNivel && (
          <div className="mt-3 bg-white/20 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold">👑 Você está no nível máximo!</p>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="bg-card p-5 space-y-5">

        {/* Serviços por semana */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> Serviços por semana
            </label>
            <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{servicosPorSemana}</span>
          </div>
          <Slider min={10} max={80} step={5} value={[servicosPorSemana]} onValueChange={([v]) => setServicosPorSemana(v)} className="w-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>10 (baixo)</span><span>55 (padrão)</span><span>80 (alto)</span>
          </div>
        </div>

        {/* Taxa de conclusão */}
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
          <Slider min={30} max={100} step={5} value={[taxaConclusao]} onValueChange={([v]) => setTaxaConclusao(v)} className="w-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>30%</span><span>70%</span><span>100%</span>
          </div>
        </div>

        {/* Toggles adicionais */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-primary" /> Trabalha também em:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setComDomingo(!comDomingo)}
              className={cn(
                "rounded-2xl border-2 p-3 text-xs font-bold transition-all text-left",
                comDomingo ? "border-purple-500 bg-purple-50 text-purple-900" : "border-border bg-muted/30 text-muted-foreground"
              )}
            >
              <p>☀️ Domingos</p>
              <p className={cn("text-[10px] font-semibold mt-0.5", comDomingo ? "text-purple-700" : "text-muted-foreground")}>+70% no ticket</p>
            </button>
            <button
              onClick={() => setComFeriado(!comFeriado)}
              className={cn(
                "rounded-2xl border-2 p-3 text-xs font-bold transition-all text-left",
                comFeriado ? "border-orange-500 bg-orange-50 text-orange-900" : "border-border bg-muted/30 text-muted-foreground"
              )}
            >
              <p>🎉 Feriados</p>
              <p className={cn("text-[10px] font-semibold mt-0.5", comFeriado ? "text-orange-700" : "text-muted-foreground")}>+70% no ticket</p>
            </button>
          </div>
        </div>

        {/* Tabela de acréscimos */}
        <div className="bg-muted/30 rounded-2xl p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-2">Acréscimos por horário</p>
          {[
            { label: 'Seg–Sex 8h–18h',  extra: '—',   color: 'text-muted-foreground' },
            { label: 'Seg–Sex 18h–20h', extra: '+30%', color: 'text-yellow-600' },
            { label: 'Sáb 8h–14h',      extra: '—',   color: 'text-muted-foreground' },
            { label: 'Sáb 14h–16h',     extra: '+30%', color: 'text-yellow-600' },
            { label: 'Dom & Feriados',   extra: '+70%', color: 'text-red-600' },
          ].map((row, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className={cn("font-bold", row.color)}>{row.extra}</span>
            </div>
          ))}
        </div>

        {/* Resumo rápido */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Serv./mês', value: calc.totalServicos },
            { label: 'Repasse', value: `R$ ${calc.repasse.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
            { label: 'Bônus', value: `R$ ${(calc.bonusCashback + calc.bonusAvaliacao).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
          ].map((item, i) => (
            <div key={i} className="bg-muted/50 rounded-xl p-2.5 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-black text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Detalhamento expandido */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-primary hover:text-primary/80 transition-colors pt-3 border-t border-border"
        >
          <span>Ver detalhamento por faixa horária</span>
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
              {calc.detalhe.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-muted/40 rounded-xl px-3 py-2">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-bold text-foreground">
                    R$ {(item.servs * TICKET_MEDIO * item.fator).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs bg-muted/40 rounded-xl px-3 py-2">
                <span className={cn("text-muted-foreground", nivelAtual.bonus === 0 && "opacity-50")}>Bônus cashback (R$ {nivelAtual.bonus.toFixed(2)}/serviço)</span>
                <span className="font-bold text-emerald-600">R$ {calc.bonusCashback.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-xs bg-muted/40 rounded-xl px-3 py-2">
                <span className={cn("text-muted-foreground", averageRating < 4.5 && "line-through opacity-50")}>
                  Bônus avaliação {averageRating >= 4.5 ? `≥ 4.5★ (R$ ${nivelAtual.ratingBonus.toFixed(2)}/serviço)` : '(requer ≥ 4.5★)'}
                </span>
                <span className={cn("font-bold", averageRating >= 4.5 ? "text-yellow-600" : "text-muted-foreground opacity-40")}>
                  R$ {calc.bonusAvaliacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm bg-primary/10 rounded-xl px-3 py-2 font-black">
                <span className="text-primary">Total estimado / mês</span>
                <span className="text-primary">R$ {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                * Estimativa com base nos acréscimos reais por faixa horária. Valores podem variar.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}