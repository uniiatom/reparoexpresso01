import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const MEDAL_MAP = {
  Bronze:   'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/beff780b4_e48a41ce-d15e-44b2-8df1-7487b68f1679.jpg',
  Prata:    'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/05ab5e26d_85fcbee0-e8ea-46da-8acc-2123447265f2.jpg',
  Ouro:     'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/626743952_c309f1db-b2cf-42a1-997f-c1914b668017.jpg',
  Diamante: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/986b148d7_5881e20d-7f64-4577-8257-548343ea0eb8.jpg',
  Rubi:     'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/94c981b4c_ff72e285-f447-4c8f-865e-8987a647a613.jpg',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProviderLevelHistoryTimeline({ providerId }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['provider-level-history', providerId],
    queryFn: () =>
      base44.entities.ProviderLevelHistory.filter(
        { provider_id: providerId },
        '-mudanca_em',
        20
      ),
    enabled: !!providerId,
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="h-4 bg-muted rounded w-40 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-primary" />
        <p className="text-sm font-bold text-foreground">Histórico de Mudanças de Nível</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Nenhuma mudança de nível registrada ainda</p>
          <p className="text-xs text-muted-foreground mt-1">As mudanças são registradas automaticamente a cada quinzena</p>
        </div>
      ) : (
        <div className="relative space-y-3">
          {/* Linha vertical */}
          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />

          {history.map((item, idx) => {
            const subiu = item.direcao === 'subiu';
            const ganhoExtra = (item.bonus_novo || 0) - (item.bonus_anterior || 0);
            const servicosMes = Math.round(55 * 4.33 * 0.9);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex gap-3 items-start relative"
              >
                {/* Ícone na linha */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2",
                  subiu
                    ? "bg-emerald-100 border-emerald-400"
                    : "bg-red-100 border-red-300"
                )}>
                  {subiu
                    ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                    : <TrendingDown className="w-4 h-4 text-red-500" />
                  }
                </div>

                {/* Card */}
                <div className={cn(
                  "flex-1 rounded-2xl border px-4 py-3",
                  subiu ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                )}>
                  {/* Linha principal */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src={MEDAL_MAP[item.nivel_anterior]} alt={item.nivel_anterior} className="w-6 h-6 object-contain" />
                      <span className={cn("text-xs font-bold", subiu ? "text-emerald-800" : "text-red-800")}>{item.nivel_anterior}</span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <img src={MEDAL_MAP[item.nivel_novo]} alt={item.nivel_novo} className="w-6 h-6 object-contain" />
                      <span className={cn("text-sm font-black", subiu ? "text-emerald-900" : "text-red-900")}>{item.nivel_novo}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      subiu ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"
                    )}>
                      {subiu ? '▲ Subiu' : '▼ Desceu'}
                    </span>
                  </div>

                  {/* Detalhes */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className={cn("text-xs font-black", subiu ? "text-emerald-700" : "text-red-700")}>
                        {item.total_jobs_na_mudanca}
                      </p>
                      <p className="text-[10px] text-muted-foreground">serviços</p>
                    </div>
                    <div>
                      <p className={cn("text-xs font-black", subiu ? "text-emerald-700" : "text-red-700")}>
                        {item.rating_na_mudanca?.toFixed(1) || '—'} ★
                      </p>
                      <p className="text-[10px] text-muted-foreground">avaliação</p>
                    </div>
                    <div>
                      <p className={cn(
                        "text-xs font-black",
                        ganhoExtra > 0 ? "text-emerald-700" : ganhoExtra < 0 ? "text-red-700" : "text-muted-foreground"
                      )}>
                        {ganhoExtra !== 0
                          ? `${ganhoExtra > 0 ? '+' : ''}R$ ${(ganhoExtra * servicosMes).toFixed(0)}/mês`
                          : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">variação bônus</p>
                    </div>
                  </div>

                  {/* Data */}
                  <p className="text-[10px] text-muted-foreground mt-2 text-right">
                    {formatDate(item.mudanca_em || item.created_date)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}