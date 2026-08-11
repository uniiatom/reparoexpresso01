import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIVEIS, getNivelAtual } from './JornadaHeroCard';

export default function JornadaNivelRoadmap({ totalServices }) {
  const nivelAtual = getNivelAtual(totalServices);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground mb-4">🗺️ Sua Jornada de Níveis</h2>

      {NIVEIS.map((nivel, idx) => {
        const isAtual = nivel.id === nivelAtual.id;
        const isConcluido = nivel.id < nivelAtual.id;
        const isLocked = nivel.id > nivelAtual.id;
        const faltam = Math.max(0, nivel.min - totalServices);

        return (
          <motion.div
            key={nivel.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.07 }}
          >
            <div className={cn(
              'relative rounded-2xl border-2 p-4 transition-all',
              isAtual && 'border-primary bg-primary/5 shadow-md',
              isConcluido && 'border-green-500/40 bg-green-500/5',
              isLocked && 'border-border/50 bg-muted/20 opacity-70'
            )}>
              {isAtual && (
                <div className="absolute -top-2.5 left-4">
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    VOCÊ ESTÁ AQUI
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Icon de status */}
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg',
                  isConcluido ? 'bg-green-100' : isAtual ? 'bg-primary/10' : 'bg-muted'
                )}>
                  {isConcluido ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <span>{nivel.emoji}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base">{nivel.emoji}</span>
                    <p className={cn(
                      'font-bold text-sm',
                      isConcluido ? 'text-green-600' : isAtual ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      Nível {nivel.id} — {nivel.nome}
                    </p>
                    {isConcluido && <Check className="w-3.5 h-3.5 text-green-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {nivel.id === 5 ? `${nivel.min}+ serviços` : `${nivel.min}–${nivel.max} serviços`}
                  </p>
                </div>

                {/* Badge de desconto */}
                {nivel.desconto > 0 ? (
                  <div className={cn(
                    'rounded-xl px-2.5 py-1.5 text-center flex-shrink-0',
                    isLocked ? 'bg-muted' : 'bg-primary/10'
                  )}>
                    <p className={cn('font-black text-base leading-none', isLocked ? 'text-muted-foreground' : 'text-primary')}>
                      {nivel.desconto}%
                    </p>
                    <p className="text-[9px] text-muted-foreground font-semibold">OFF</p>
                  </div>
                ) : (
                  <div className="rounded-xl px-2.5 py-1.5 bg-muted text-center flex-shrink-0">
                    <p className="text-xs text-muted-foreground font-semibold">Padrão</p>
                  </div>
                )}
              </div>

              {/* Benefícios */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {nivel.desconto > 0 && (
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    isLocked ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-700'
                  )}>
                    🏷️ {nivel.desconto}% desconto
                  </span>
                )}
                {nivel.prioridade && (
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    isLocked ? 'bg-muted text-muted-foreground' : 'bg-blue-100 text-blue-700'
                  )}>
                    ⚡ Agendamento prioritário
                  </span>
                )}
                {nivel.id >= 3 && (
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    isLocked ? 'bg-muted text-muted-foreground' : 'bg-purple-100 text-purple-700'
                  )}>
                    🌟 Prestadores exclusivos
                  </span>
                )}
                {nivel.id >= 4 && (
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    isLocked ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-700'
                  )}>
                    🛡️ Garantia estendida
                  </span>
                )}
                {nivel.id === 5 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    👑 Suporte VIP
                  </span>
                )}
              </div>

              {/* Falta X serviços */}
              {isLocked && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    🔒 Faltam <strong>{faltam}</strong> {faltam === 1 ? 'serviço' : 'serviços'} para desbloquear
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}