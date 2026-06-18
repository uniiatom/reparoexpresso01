import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Star, Award, Medal, MapPin, ChevronRight, Trophy, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MEDAL_COLORS = {
  0: 'text-yellow-400', // ouro
  1: 'text-slate-300',  // prata
  2: 'text-amber-600',  // bronze
};

const MEDAL_ICONS = {
  0: Crown,
  1: Medal,
  2: Trophy,
};

const BADGE_BG = ['from-yellow-500/20 to-amber-600/10', 'from-slate-400/20 to-slate-500/10', 'from-amber-600/20 to-orange-700/10'];

export default function TopProfissionais() {
  const navigate = useNavigate();

  const { data: topProviders = [], isLoading } = useQuery({
    queryKey: ['top-providers'],
    queryFn: async () => {
      // Busca todos os ProviderAchievement (prestadores com jornada)
      const achievements = await base44.entities.ProviderAchievement
        .list('-average_rating', 50);

      // Filtra os que têm avaliação e ordena por score composto
      const scored = achievements
        .filter(a => a.average_rating > 0)
        .map(a => {
          const achievementsCount = (a.achievements_unlocked || []).length;
          const score = (a.average_rating * 20) + (achievementsCount * 5) + (a.level || 1);
          return { ...a, achievementsCount, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Busca detalhes dos providers (foto, cidade, etc)
      const providerIds = scored.map(a => a.provider_id);
      const providers = await Promise.all(
        providerIds.map(id =>
          base44.entities.Provider.filter({ id }).then(list => list[0] || null)
        )
      );

      return scored.map((ach, i) => ({
        ...ach,
        photo_url: providers[i]?.photo_url || null,
        city: providers[i]?.city || '',
        state: providers[i]?.state || '',
        specialties: providers[i]?.specialties || [],
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || topProviders.length === 0) return null;

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 mt-6 pb-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-display tracking-wider text-foreground uppercase flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Top Profissionais
          </h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            Ranking da plataforma
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Os prestadores mais bem avaliados e com mais conquistas
        </p>
      </div>

      <div className="space-y-3">
        {topProviders.map((provider, idx) => {
          const MedalIcon = idx < 3 ? MEDAL_ICONS[idx] : null;
          const medalColor = MEDAL_COLORS[idx] || 'text-muted-foreground';

          return (
            <motion.button
              key={provider.provider_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => navigate(`/prestador/${provider.provider_id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all',
                'bg-card border border-border hover:border-primary/30',
                'shadow-sm hover:shadow-md',
                idx === 0 && 'bg-gradient-to-r from-yellow-500/8 to-card border-yellow-500/30'
              )}
            >
              {/* Posição / Medalha */}
              <div className="flex-shrink-0 w-10 flex flex-col items-center">
                {idx < 3 ? (
                  <MedalIcon className={cn('w-7 h-7', medalColor)} />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                )}
              </div>

              {/* Foto */}
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                {provider.photo_url ? (
                  <img src={provider.photo_url} alt={provider.provider_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary">
                    {provider.provider_name?.charAt(0) || '?'}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground truncate">{provider.provider_name}</p>
                  {idx === 0 && (
                    <span className="text-[10px] font-bold bg-yellow-500/15 text-yellow-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      #1
                    </span>
                  )}
                </div>
                {provider.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {provider.city}{provider.state ? `/${provider.state}` : ''}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {/* Estrelas */}
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-foreground">
                      {provider.average_rating?.toFixed(1)}
                    </span>
                  </div>
                  {/* Serviços */}
                  <span className="text-xs text-muted-foreground">
                    {provider.total_jobs_completed} serviços
                  </span>
                  {/* Conquistas */}
                  <div className="flex items-center gap-0.5">
                    <Award className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {provider.achievementsCount} medalhas
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}