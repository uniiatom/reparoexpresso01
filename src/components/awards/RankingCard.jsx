import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function ScoreBar({ value, max = 100, color }) {
  return (
    <div className="flex-1 bg-muted rounded-full h-1.5">
      <div
        className={cn('h-1.5 rounded-full', color)}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}

export default function RankingCard({ rank, provider, goal }) {
  const isTop3 = rank <= 3;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
      isTop3 ? 'bg-amber-50/50 border-amber-100' : 'bg-card border-border',
      !provider.qualified && 'opacity-60'
    )}>
      {/* Posição */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0',
        rank === 1 ? 'bg-amber-400 text-white' :
        rank === 2 ? 'bg-slate-300 text-slate-700' :
        rank === 3 ? 'bg-orange-300 text-orange-800' :
        'bg-muted text-muted-foreground text-xs'
      )}>
        {MEDAL[rank] || rank}
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-foreground">
        {provider.photo_url
          ? <img src={provider.photo_url} alt={provider.provider_name} className="w-full h-full object-cover" />
          : provider.provider_name?.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{provider.provider_name}</p>
          {provider.qualified
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          }
        </div>
        <div className="flex items-center gap-3 mt-1">
          <ScoreBar value={provider.avg_rating} max={5} color="bg-amber-400" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">⭐ {provider.avg_rating}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <ScoreBar value={provider.avg_punctuality} max={5} color="bg-blue-400" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">⏱️ {provider.avg_punctuality}</span>
        </div>
      </div>

      {/* Métricas */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-xs text-muted-foreground">{provider.jobs} serviço{provider.jobs !== 1 ? 's' : ''}</p>
        <p className="text-sm font-extrabold text-primary">Score {provider.score}</p>
      </div>
    </div>
  );
}