import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const BADGES = [
  // Serviços
  { key: 'first_service',      cat: 'servicos',  emoji: '🎯', nome: 'Primeiro Passo',     desc: 'Realizou seu 1º serviço',             req: s => s >= 1,   hint: '1 serviço', recompensa: null },
  { key: 'three_services',     cat: 'servicos',  emoji: '🔧', nome: 'Mão na Massa',        desc: 'Completou 3 serviços',                req: s => s >= 3,   hint: '3 serviços', recompensa: '5% OFF' },
  { key: 'ten_services',       cat: 'servicos',  emoji: '⭐', nome: 'Cliente Frequente',   desc: 'Completou 10 serviços',               req: s => s >= 10,  hint: '10 serviços', recompensa: '10% OFF' },
  { key: 'twenty_services',    cat: 'servicos',  emoji: '🔥', nome: 'Veterano',            desc: 'Completou 20 serviços',               req: s => s >= 20,  hint: '20 serviços', recompensa: '15% OFF' },
  { key: 'fifty_services',     cat: 'servicos',  emoji: '👑', nome: 'Lenda',               desc: 'Completou 50 serviços — você é incrível!', req: s => s >= 50, hint: '50 serviços', recompensa: '20% OFF + VIP' },
  // Gastos
  { key: 'spent_500',          cat: 'gastos',    emoji: '💳', nome: 'Investidor',          desc: 'Investiu R$ 500 em serviços',         req: (s, sp) => sp >= 500,   hint: 'R$ 500 gastos', recompensa: null },
  { key: 'spent_2000',         cat: 'gastos',    emoji: '💎', nome: 'Cliente Premium',     desc: 'Investiu R$ 2.000 em serviços',       req: (s, sp) => sp >= 2000,  hint: 'R$ 2.000 gastos', recompensa: '🎁 Bônus surpresa' },
  { key: 'spent_5000',         cat: 'gastos',    emoji: '🏆', nome: 'Cliente Gold',        desc: 'Investiu R$ 5.000 em serviços',       req: (s, sp) => sp >= 5000,  hint: 'R$ 5.000 gastos', recompensa: 'Prioridade máxima' },
  // Diversidade
  { key: 'multi_service',      cat: 'especiais', emoji: '🎪', nome: 'Multi Serviços',      desc: 'Solicitou 3 tipos diferentes de serviço', req: (s, sp, pts, reqs) => new Set(reqs.map(r => r.service_type)).size >= 3, hint: '3 tipos diferentes', recompensa: null },
  { key: 'five_types',         cat: 'especiais', emoji: '🌈', nome: 'Explorador Total',    desc: 'Solicitou 5 categorias distintas',    req: (s, sp, pts, reqs) => new Set(reqs.map(r => r.service_type)).size >= 5, hint: '5 categorias', recompensa: '5% extra' },
  // Pontos
  { key: 'points_100',         cat: 'pontos',    emoji: '⚡', nome: 'Acumulador',          desc: 'Acumulou 100 pontos',                 req: (s, sp, pts) => pts >= 100,  hint: '100 pontos', recompensa: null },
  { key: 'points_500',         cat: 'pontos',    emoji: '🚀', nome: 'Power User',          desc: 'Acumulou 500 pontos',                 req: (s, sp, pts) => pts >= 500,  hint: '500 pontos', recompensa: null },
  { key: 'points_1000',        cat: 'pontos',    emoji: '🌟', nome: 'Super Star',          desc: 'Acumulou 1.000 pontos',               req: (s, sp, pts) => pts >= 1000, hint: '1.000 pontos', recompensa: 'Resgate duplo' },
];

const CAT_LABELS = {
  todos:    'Todos',
  servicos: '🔧 Serviços',
  gastos:   '💳 Gastos',
  pontos:   '⚡ Pontos',
  especiais:'✨ Especiais',
};

export default function JornadaBadgesGrid({ totalServices, totalSpent, totalPoints, serviceRequests }) {
  const [filter, setFilter] = useState('todos');
  const [selected, setSelected] = useState(null);

  const unlocked = (badge) => badge.req(totalServices, totalSpent, totalPoints, serviceRequests);

  const filtered = filter === 'todos' ? BADGES : BADGES.filter(b => b.cat === filter);
  const unlockedCount = BADGES.filter(b => unlocked(b)).length;

  return (
    <div className="space-y-4">
      {/* Progresso geral */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-foreground">🏅 Badges conquistados</p>
          <p className="text-sm font-bold text-primary">{unlockedCount}/{BADGES.length}</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / BADGES.length) * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-primary rounded-full"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{Math.round((unlockedCount / BADGES.length) * 100)}% desbloqueado</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {Object.entries(CAT_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((badge, idx) => {
          const isUnlocked = unlocked(badge);
          return (
            <motion.button
              key={badge.key}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => setSelected(badge)}
              className={cn(
                'rounded-2xl border-2 p-3 flex flex-col items-center text-center transition-all active:scale-95',
                isUnlocked
                  ? 'border-primary/50 bg-primary/5 shadow-sm'
                  : 'border-border/40 bg-muted/20 opacity-55'
              )}
            >
              <div className={cn('text-2xl mb-1', !isUnlocked && 'grayscale')}>
                {isUnlocked ? badge.emoji : '🔒'}
              </div>
              <p className={cn('text-[11px] font-bold leading-tight', isUnlocked ? 'text-foreground' : 'text-muted-foreground')}>
                {badge.nome}
              </p>
              {isUnlocked && badge.recompensa && (
                <span className="mt-1.5 text-[9px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                  {badge.recompensa}
                </span>
              )}
              {!isUnlocked && (
                <p className="text-[9px] text-muted-foreground mt-1">{badge.hint}</p>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Modal de detalhe */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-0"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-3xl w-full max-w-lg p-6 pb-10"
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
              <div className="flex justify-between items-start mb-4">
                <div />
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded-xl">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center">
                <div className={cn('text-6xl mb-3', !unlocked(selected) && 'grayscale opacity-50')}>
                  {unlocked(selected) ? selected.emoji : '🔒'}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{selected.nome}</h3>
                <p className="text-sm text-muted-foreground mb-4">{selected.desc}</p>
                {unlocked(selected) ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <p className="text-green-700 font-bold text-sm">✅ Badge conquistado!</p>
                    {selected.recompensa && (
                      <p className="text-green-600 text-xs mt-1">🎁 Benefício: {selected.recompensa}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted rounded-2xl p-4">
                    <p className="text-muted-foreground text-sm">🔒 Bloqueado</p>
                    <p className="text-xs text-muted-foreground mt-1">Necessário: {selected.hint}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}