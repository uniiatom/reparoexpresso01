import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AchievementsPanel({ providerId }) {
  const [filter, setFilter] = useState('all');

  const { data: achievement } = useQuery({
    queryKey: ['provider-achievement', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const list = await base44.entities.ProviderAchievement.filter({ provider_id: providerId });
      return list[0] || null;
    },
    enabled: !!providerId,
  });

  const { data: allAchievements = [], isLoading } = useQuery({
    queryKey: ['all-achievements'],
    queryFn: () => base44.entities.Achievement.list(),
  });

  const unlockedKeys = achievement?.achievements_unlocked || [];
  const achievementsByCategory = allAchievements.reduce((acc, ach) => {
    if (!acc[ach.category]) acc[ach.category] = [];
    acc[ach.category].push(ach);
    return acc;
  }, {});

  const categoryLabels = {
    jobs: '🎯 Serviços',
    rating: '⭐ Avaliações',
    milestone: '🏆 Marcos',
    special: '✨ Especiais',
  };

  const filteredAchievements = filter === 'all' ? allAchievements : achievementsByCategory[filter] || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          Todas ({allAchievements.length})
        </button>
        {Object.entries(categoryLabels).map(([cat, label]) => {
          const count = achievementsByCategory[cat]?.length || 0;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                filter === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid de Conquistas */}
      <div className="grid grid-cols-3 gap-3">
        {filteredAchievements.map((achievement) => {
          const isUnlocked = unlockedKeys.includes(achievement.key);
          return (
            <div
              key={achievement.key}
              className={cn(
                'rounded-2xl p-3 border-2 transition-all flex flex-col items-center text-center',
                isUnlocked
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/50 bg-muted/30 opacity-60'
              )}
            >
              <div className="text-2xl mb-1.5">{achievement.icon}</div>
              <h4 className="text-xs font-bold text-foreground leading-tight mb-0.5 min-h-[1.5rem]">
                {achievement.name}
              </h4>
              <p className="text-[10px] text-muted-foreground leading-tight mb-1.5 flex-1">
                {achievement.description}
              </p>

              {!isUnlocked && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>Bloqueado</span>
                </div>
              )}

              {isUnlocked && achievement.visibility_bonus > 0 && (
                <div className="text-[10px] font-semibold text-green-600">
                  +{achievement.visibility_bonus}% visibilidade
                </div>
              )}

              {!isUnlocked && (
                <div className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border w-full">
                  {achievement.requirement_type === 'jobs_completed' && `${achievement.requirement_value}+ serviços`}
                  {achievement.requirement_type === 'average_rating' && `${achievement.requirement_value}+ ⭐`}
                  {achievement.requirement_type === 'jobs_with_perfect_rating' && `${achievement.requirement_value}+ avaliações 5⭐`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma conquista nesta categoria</p>
        </div>
      )}

      {/* Stats Resumo */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{unlockedKeys.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Desbloqueadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{allAchievements.length - unlockedKeys.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Faltam desbloquear</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${(unlockedKeys.length / allAchievements.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {Math.round((unlockedKeys.length / allAchievements.length) * 100)}% progresso
          </p>
        </CardContent>
      </Card>
    </div>
  );
}