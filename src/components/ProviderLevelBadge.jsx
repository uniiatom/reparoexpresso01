import React from 'react';
import { cn } from '@/lib/utils';

export const PROVIDER_LEVELS = [
  {
    key: 'pro',
    label: 'Pro',
    emoji: '⭐',
    minJobs: 120,
    minRating: 4,
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    gradientBg: 'from-blue-500 to-blue-600',
    glowColor: 'shadow-blue-200',
    description: '120+ serviços + ≥ 4★ · +R$ 3,00/serviço',
  },
  {
    key: 'pro_plus',
    label: 'Pro Plus',
    emoji: '🔥',
    minJobs: 160,
    minRating: 4,
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    gradientBg: 'from-purple-500 to-pink-500',
    glowColor: 'shadow-purple-200',
    description: '160+ serviços + ≥ 4★ · +R$ 3,50/serviço',
  },
  {
    key: 'pro_elite',
    label: 'Pro Elite',
    emoji: '💎',
    minJobs: 190,
    minRating: 4,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    gradientBg: 'from-emerald-500 to-teal-500',
    glowColor: 'shadow-emerald-200',
    description: '190+ serviços + ≥ 4★ · +R$ 4,00/serviço',
  },
  {
    key: 'pro_lenda',
    label: 'Pro Lenda',
    emoji: '👑',
    minJobs: 220,
    minRating: 5,
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    gradientBg: 'from-amber-400 to-orange-500',
    glowColor: 'shadow-amber-200',
    description: '220+ serviços + 5★ · +R$ 5,00/serviço',
  },
];

export function getProviderLevel(totalJobs, rating) {
  const jobs = totalJobs || 0;
  const r = rating || 0;
  // Verifica do mais alto para o mais baixo
  for (let i = PROVIDER_LEVELS.length - 1; i >= 0; i--) {
    const lvl = PROVIDER_LEVELS[i];
    if (jobs >= lvl.minJobs && r >= lvl.minRating) return lvl;
  }
  return null;
}

export default function ProviderLevelBadge({ totalJobs, rating, size = 'md', showDescription = false, variant = 'default' }) {
  const level = getProviderLevel(totalJobs, rating);
  if (!level) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const gradientMap = {
    pro:       'linear-gradient(to right, #3b82f6, #2563eb)',
    pro_plus:  'linear-gradient(to right, #a855f7, #ec4899)',
    pro_elite: 'linear-gradient(to right, #10b981, #14b8a6)',
    pro_lenda: 'linear-gradient(to right, #f59e0b, #f97316)',
  };

  // variant="highlight" — card destacado para perfil público
  if (variant === 'highlight') {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-4 shadow-lg"
        style={{ background: gradientMap[level.key] }}
      >
        <span className="text-4xl">{level.emoji}</span>
        <div className="text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Nível do Prestador</p>
          <p className="text-xl font-black leading-tight">{level.label}</p>
          <p className="text-xs opacity-80 mt-0.5">{level.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className={cn(
        'inline-flex items-center font-bold rounded-full border',
        level.color,
        sizeClasses[size]
      )}>
        <span>{level.emoji}</span>
        <span>{level.label}</span>
      </span>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{level.description}</span>
      )}
    </div>
  );
}