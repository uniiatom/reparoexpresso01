import React from 'react';
import { Star, Zap, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const NIVEIS = [
  { id: 1, nome: 'Iniciante',    emoji: '🌱', min: 0,   max: 2,   cor: '#6b7280', bg: 'from-gray-500 to-gray-600',    desconto: 0,   prioridade: false },
  { id: 2, nome: 'Explorador',   emoji: '🧭', min: 3,   max: 7,   cor: '#3b82f6', bg: 'from-blue-500 to-blue-600',    desconto: 5,   prioridade: false },
  { id: 3, nome: 'Fiel',         emoji: '⭐', min: 8,   max: 14,  cor: '#8b5cf6', bg: 'from-violet-500 to-purple-600', desconto: 10,  prioridade: false },
  { id: 4, nome: 'Veterano',     emoji: '🔥', min: 15,  max: 24,  cor: '#f59e0b', bg: 'from-amber-500 to-orange-500',  desconto: 15,  prioridade: true  },
  { id: 5, nome: 'Lendário',     emoji: '👑', min: 25,  max: 999, cor: '#eab308', bg: 'from-yellow-400 to-amber-500',  desconto: 20,  prioridade: true  },
];

export function getNivelAtual(totalServices) {
  return NIVEIS.find(n => totalServices >= n.min && totalServices <= n.max) || NIVEIS[0];
}

export function getProgressoNivel(totalServices) {
  const nivel = getNivelAtual(totalServices);
  if (nivel.id === 5) return 100;
  const range = nivel.max - nivel.min + 1;
  const done = totalServices - nivel.min;
  return Math.min(100, Math.round((done / range) * 100));
}

export default function JornadaHeroCard({ totalServices, totalSpent, totalPoints, userName }) {
  const nivel = getNivelAtual(totalServices);
  const progresso = getProgressoNivel(totalServices);
  const proximo = NIVEIS.find(n => n.id === nivel.id + 1);
  const faltam = proximo ? proximo.min - totalServices : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('relative rounded-3xl p-6 mb-6 overflow-hidden shadow-lg bg-gradient-to-br', nivel.bg)}
    >
      {/* bg decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-4 -right-4 text-[120px]">{nivel.emoji}</div>
      </div>

      <div className="relative z-10">
        {/* Nome e nível */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/80 text-xs font-semibold mb-0.5">
              {userName ? `Olá, ${userName.split(' ')[0]}!` : 'Sua jornada'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{nivel.emoji}</span>
              <div>
                <h2 className="text-2xl font-black text-white">{nivel.nome}</h2>
                <p className="text-white/70 text-xs">Nível {nivel.id} de 5</p>
              </div>
            </div>
          </div>
          {nivel.desconto > 0 && (
            <div className="bg-white/20 rounded-2xl px-3 py-2 text-center">
              <p className="text-white font-black text-xl">{nivel.desconto}%</p>
              <p className="text-white/80 text-[10px] font-semibold">DESCONTO</p>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>{totalServices} serviços realizados</span>
            {proximo && <span>Próximo: {proximo.nome} em {faltam} serv.</span>}
            {!proximo && <span>🏆 Nível máximo!</span>}
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progresso}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-white rounded-full"
            />
          </div>
          <p className="text-white/60 text-xs mt-1">{progresso}% para o próximo nível</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '🔧', value: totalServices, label: 'Serviços' },
            { icon: '💰', value: `R$ ${totalSpent.toFixed(0)}`, label: 'Investidos' },
            { icon: '⚡', value: totalPoints, label: 'Pontos' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-xl p-2 text-center">
              <p className="text-base">{s.icon}</p>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-white/60 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}