import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const REGRAS = [
  {
    nivel: 'Bronze',
    minJobs: 0,
    maxJobs: 119,
    minEstrelas: null,
    bonus: 0,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/beff780b4_e48a41ce-d15e-44b2-8df1-7487b68f1679.jpg',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
    desc: 'Nível inicial — sem bônus cashback ainda.',
  },
  {
    nivel: 'Prata',
    minJobs: 120,
    maxJobs: 159,
    minEstrelas: 4.0,
    bonus: 3.00,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/05ab5e26d_85fcbee0-e8ea-46da-8acc-2123447265f2.jpg',
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    text: 'text-slate-900',
    badge: 'bg-slate-100 text-slate-800',
    desc: 'De 120 a 159 serviços com avaliação mínima de 4,0 ★.',
  },
  {
    nivel: 'Ouro',
    minJobs: 160,
    maxJobs: 189,
    minEstrelas: 4.0,
    bonus: 3.50,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/626743952_c309f1db-b2cf-42a1-997f-c1914b668017.jpg',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-900',
    badge: 'bg-yellow-100 text-yellow-800',
    desc: 'De 160 a 189 serviços com avaliação mínima de 4,0 ★.',
  },
  {
    nivel: 'Diamante',
    minJobs: 190,
    maxJobs: 219,
    minEstrelas: 4.0,
    bonus: 4.00,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/986b148d7_5881e20d-7f64-4577-8257-548343ea0eb8.jpg',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800',
    desc: 'De 190 a 219 serviços com avaliação mínima de 4,0 ★.',
  },
  {
    nivel: 'Rubi',
    minJobs: 220,
    maxJobs: null,
    minEstrelas: 4.5,
    bonus: 5.00,
    medal: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/94c981b4c_ff72e285-f447-4c8f-865e-8987a647a613.jpg',
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-800',
    desc: '220 ou mais serviços com avaliação mínima de 4,5 ★.',
  },
];

function Stars({ value }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={cn("text-xs", s <= Math.round(value) ? 'text-yellow-400' : 'text-gray-300')}>★</span>
      ))}
      <span className="text-xs font-bold ml-0.5">{value?.toFixed(1)}</span>
    </span>
  );
}

export default function ProviderCashbackRules({ totalJobsCompleted = 0, averageRating = 5 }) {
  const [open, setOpen] = useState(false);

  // Determina nível atual com base em serviços + estrelas
  const nivelAtual = (() => {
    for (let i = REGRAS.length - 1; i >= 0; i--) {
      const r = REGRAS[i];
      const okJobs = totalJobsCompleted >= r.minJobs;
      const okStars = r.minEstrelas === null || averageRating >= r.minEstrelas;
      if (okJobs && okStars) return r.nivel;
    }
    return 'Bronze';
  })();

  return (
    <div className="rounded-3xl border border-border overflow-hidden bg-card shadow-sm">
      {/* Header clicável */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Regras de Cashback por Nível</span>
          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Você: {nivelAtual}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">

              {/* Legenda de como funciona */}
              <div className="bg-muted/40 rounded-2xl p-3 text-xs text-muted-foreground space-y-1 mb-3">
                <p className="font-bold text-foreground">Como funciona o cashback?</p>
                <p>• O bônus é pago <strong>por serviço concluído</strong>, acumulado quinzenalmente.</p>
                <p>• Para subir de nível você precisa atingir o <strong>número de serviços</strong> E a <strong>avaliação mínima</strong>.</p>
                <p>• Avaliação abaixo do mínimo = mantém no nível anterior mesmo com serviços suficientes.</p>
                <p>• Saque via PIX a partir de <strong>R$ 200,00</strong> acumulados, ou use em cursos com valor × 2,5.</p>
              </div>

              {/* Tabela de níveis */}
              {REGRAS.map((r) => {
                const isAtual = r.nivel === nivelAtual;
                const atingiuJobs = totalJobsCompleted >= r.minJobs;
                const atingiuStars = r.minEstrelas === null || averageRating >= r.minEstrelas;
                const desbloqueado = atingiuJobs && atingiuStars;

                return (
                  <div
                    key={r.nivel}
                    className={cn(
                      "rounded-2xl border-2 p-3 transition-all",
                      isAtual ? `${r.bg} ${r.border}` : 'border-border bg-muted/20 opacity-70'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <img src={r.medal} alt={r.nivel} className="w-10 h-10 object-contain flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-sm font-black", isAtual ? r.text : 'text-foreground')}>{r.nivel}</span>
                          {isAtual && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", r.badge)}>
                              ✓ Seu nível atual
                            </span>
                          )}
                          {!desbloqueado && totalJobsCompleted > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              🔒 Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn(
                          "text-base font-black",
                          r.bonus === 0 ? 'text-muted-foreground' : isAtual ? r.text : 'text-foreground'
                        )}>
                          {r.bonus === 0 ? '—' : `R$ ${r.bonus.toFixed(2)}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">por serviço</p>
                      </div>
                    </div>

                    {/* Requisitos detalhados */}
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg",
                        atingiuJobs ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                      )}>
                        🔧 {r.minJobs}{r.maxJobs ? `–${r.maxJobs}` : '+'} serviços
                        {atingiuJobs ? ' ✓' : ` (você tem ${totalJobsCompleted})`}
                      </div>
                      {r.minEstrelas !== null && (
                        <div className={cn(
                          "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg",
                          atingiuStars ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                        )}>
                          ⭐ mín. {r.minEstrelas.toFixed(1)} ★
                          {atingiuStars ? ' ✓' : ` (você tem ${averageRating.toFixed(1)}★)`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <p className="text-[10px] text-muted-foreground text-center pt-1">
                * Níveis avaliados ao final de cada quinzena com base no histórico acumulado.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}