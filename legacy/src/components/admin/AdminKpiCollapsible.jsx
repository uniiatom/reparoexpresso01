import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, CheckCircle2, Clock, Star, TrendingUp, Users, Activity, Zap, ChevronLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { LOGO_SHIELD_SRC } from '@/lib/brandAssets';

const KPI_EXPANDED_STORAGE_KEY = 'reparo_admin_kpi_expanded';

function readKpiExpandedPreference() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(KPI_EXPANDED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const KPI_ITEMS = [
  { key: 'total', label: 'Chamados', icon: Briefcase, color: 'text-foreground', format: (s) => s.total },
  { key: 'active', label: 'Ativos', icon: Clock, color: 'text-amber-500', format: (s) => s.active },
  { key: 'completed', label: 'Concluídos', icon: CheckCircle2, color: 'text-green-500', format: (s) => s.completed },
  { key: 'clients', label: 'Clientes', icon: Users, color: 'text-sky-500', format: (s) => s.clients_total },
  { key: 'users', label: 'Usuários', icon: Activity, color: 'text-purple-500', format: (s) => s.users_total },
  { key: 'online', label: 'Online', icon: Zap, color: 'text-amber-500', format: (s) => s.providers_online },
  { key: 'approved', label: 'Aprovados', icon: Star, color: 'text-blue-400', format: (s) => s.providers_approved },
  { key: 'revenue', label: 'Receita', icon: TrendingUp, color: 'text-primary', format: (s) => `R$ ${Math.floor(s.revenue)}` },
];

function KpiToggle({ expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={expanded ? 'Recolher indicadores' : 'Expandir indicadores'}
      className={cn(
        'group relative flex items-center gap-2 rounded-2xl border border-white/10',
        'bg-transparent backdrop-blur-sm px-2.5 py-1.5',
        'transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.04]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute -inset-1 rounded-2xl opacity-0 transition-opacity duration-300',
          'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_70%)]',
          'group-hover:opacity-100',
          !expanded && 'animate-kpi-glow-pulse opacity-60',
        )}
      />

      <img
        src={LOGO_SHIELD_SRC}
        alt="Reparo Expresso"
        className={cn(
          'relative h-8 w-8 object-contain drop-shadow-[0_4px_14px_rgba(59,130,246,0.35)]',
          !expanded && 'animate-kpi-logo-pulse',
        )}
      />

      <ChevronLeft
        className={cn(
          'relative h-5 w-5 text-primary/80 transition-transform duration-300',
          !expanded && 'animate-kpi-arrow-pulse',
          expanded && 'rotate-180 text-muted-foreground',
        )}
        strokeWidth={2.25}
      />
    </button>
  );
}

export default function AdminKpiCollapsible({ stats }) {
  const [expanded, setExpanded] = useState(readKpiExpandedPreference);

  useEffect(() => {
    try {
      localStorage.setItem(KPI_EXPANDED_STORAGE_KEY, expanded ? '1' : '0');
    } catch {
      // modo privado ou quota — ignora
    }
  }, [expanded]);

  return (
    <div className="relative mb-4">
      <div className={cn('flex', expanded ? 'justify-end mb-2' : 'justify-end')}>
        <KpiToggle expanded={expanded} onClick={() => setExpanded((v) => !v)} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="kpi-grid"
            initial={{ height: 0, opacity: 0, y: -6 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
              {KPI_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const value = item.format(stats);
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.035, duration: 0.28 }}
                  >
                    <Card className="border-primary/[0.14] hover:border-primary/25 transition-colors">
                      <CardContent className="p-2 text-center">
                        <Icon className={cn('w-3.5 h-3.5 mx-auto mb-0.5', item.color)} />
                        <p className={cn('text-sm font-bold leading-none', item.color)}>{value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
