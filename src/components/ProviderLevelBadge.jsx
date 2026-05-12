import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVEL_CONFIG = {
  1: { name: 'Bronze',   icon: '🥉', color: 'from-amber-600 to-amber-700',   textColor: 'text-amber-700',   bgColor: 'bg-amber-50'   },
  2: { name: 'Prata',    icon: '🥈', color: 'from-slate-400 to-slate-500',   textColor: 'text-slate-700',   bgColor: 'bg-slate-50'   },
  3: { name: 'Ouro',     icon: '🏅', color: 'from-yellow-400 to-yellow-500', textColor: 'text-yellow-700',  bgColor: 'bg-yellow-50'  },
  4: { name: 'Diamante', icon: '💎', color: 'from-cyan-400 to-blue-500',     textColor: 'text-blue-700',    bgColor: 'bg-blue-50'    },
  5: { name: 'Rubi',     icon: '🔴', color: 'from-red-500 to-rose-600',      textColor: 'text-red-700',     bgColor: 'bg-red-50'     },
};

const LEVEL_REQUIREMENTS = {
  1: '0–119 serviços',
  2: '120+ serviços | 4+ ⭐',
  3: '160+ serviços | 4+ ⭐',
  4: '190+ serviços | 4+ ⭐',
  5: '220+ serviços | 4.5+ ⭐',
};

export default function ProviderLevelBadge({ providerId, showDetails = false, size = 'md' }) {
  const { data: achievement, isLoading } = useQuery({
    queryKey: ['provider-achievement', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const list = await base44.entities.ProviderAchievement.filter({ provider_id: providerId });
      return list[0] || null;
    },
    enabled: !!providerId,
  });

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }

  if (!achievement) return null;

  const level = achievement.level || 1;
  const config = LEVEL_CONFIG[level];

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xl">{config.icon}</span>
        <span className="text-xs font-bold text-foreground">{config.name}</span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl p-4 border-2', config.bgColor)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`text-4xl drop-shadow-sm`}>{config.icon}</div>
          <div>
            <p className={cn('text-lg font-black', config.textColor)}>{config.name}</p>
            <p className="text-xs text-muted-foreground">Nível {level}</p>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Serviços Concluídos</p>
              <p className={cn('font-bold text-base', config.textColor)}>{achievement.total_jobs_completed}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avaliação Média</p>
              <p className={cn('font-bold text-base', config.textColor)}>{achievement.average_rating.toFixed(1)} ⭐</p>
            </div>
            <div>
              <p className="text-muted-foreground">Visibilidade</p>
              <p className={cn('font-bold text-base', config.textColor)}>+{achievement.visibility_bonus_percent}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Conquistas</p>
              <p className={cn('font-bold text-base', config.textColor)}>{achievement.achievements_unlocked?.length || 0}</p>
            </div>
          </div>

          {level < 5 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-foreground mb-1">Próximo nível:</p>
              <p className="text-xs text-muted-foreground">{LEVEL_REQUIREMENTS[level + 1]}</p>
            </div>
          )}

          {achievement.is_featured && (
            <div className="mt-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-2 text-center">
              <p className="text-xs font-bold text-purple-700">✨ Em Destaque</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}