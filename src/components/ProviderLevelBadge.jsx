import React from 'react';
import { cn } from '@/lib/utils';

export const PROVIDER_LEVELS = [
  {
    key: 'pro',
    label: 'Pro',
    emoji: '⭐',
    minJobs: 120,
    minRating: 4,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    iconColor: 'text-blue-500',
    description: '120 serv./mês + ≥ 4★ · +R$ 2,00/serviço',
  },
  {
    key: 'pro_plus',
    label: 'Pro Plus',
    emoji: '🔥',
    minJobs: 160,
    minRating: 4,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    iconColor: 'text-purple-500',
    description: '160 serv./mês + ≥ 4★ · +R$ 3,00/serviço',
  },
  {
    key: 'pro_elite',
    label: 'Pro Elite',
    emoji: '💎',
    minJobs: 190,
    minRating: 4,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-500',
    description: '190 serv./mês + ≥ 4★ · +R$ 4,00/serviço',
  },
  {
    key: 'pro_lenda',
    label: 'Pro Lenda',
    emoji: '👑',
    minJobs: 220,
    minRating: 5,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    iconColor: 'text-yellow-500',
    description: '220 serv./mês + 5★ · +R$ 5,00/serviço',
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

export default function ProviderLevelBadge({ totalJobs, rating, size = 'md', showDescription = false }) {
  const level = getProviderLevel(totalJobs, rating);
  if (!level) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  };

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