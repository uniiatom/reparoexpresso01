import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, CheckCircle2, XCircle, Navigation, Wrench, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  aguardando:   { label: 'Aguardando aceite',     emoji: '⏳', color: 'bg-yellow-100 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-400' },
  agendado:     { label: 'Agendado',               emoji: '📅', color: 'bg-blue-100 text-blue-700 border-blue-200',         dot: 'bg-blue-400' },
  aceito:       { label: 'Prestador confirmado',   emoji: '✅', color: 'bg-blue-100 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  a_caminho:    { label: 'Iniciou deslocamento',   emoji: '🚗', color: 'bg-orange-100 text-orange-700 border-orange-200',   dot: 'bg-orange-500' },
  em_andamento: { label: 'Serviço em execução',    emoji: '🔧', color: 'bg-primary/10 text-primary border-primary/20',     dot: 'bg-primary' },
  em_espera:    { label: 'Aguardando peças',       emoji: '⏸️', color: 'bg-purple-100 text-purple-700 border-purple-200',  dot: 'bg-purple-400' },
  concluido:    { label: 'Concluído',              emoji: '🎉', color: 'bg-green-100 text-green-700 border-green-200',     dot: 'bg-green-500' },
  cancelado:    { label: 'Cancelado',              emoji: '❌', color: 'bg-red-100 text-red-700 border-red-200',            dot: 'bg-red-400' },
};

export default function BatchProvidersPanel({ batchRequests, currentId }) {
  const navigate = useNavigate();

  if (!batchRequests || batchRequests.length < 2) return null;

  return (
    <div className="mb-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-sm">👥</span>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{batchRequests.length} prestadores acionados</p>
          <p className="text-xs text-muted-foreground">Toque em um card para acompanhar</p>
        </div>
      </div>

      {/* Cards dos prestadores */}
      <div className={cn(
        "gap-3",
        batchRequests.length === 2 ? "grid grid-cols-2" : "flex flex-col"
      )}>
        {batchRequests.map((r, idx) => {
          const isCurrent = r.id === currentId;
          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.aguardando;

          return (
            <div
              key={r.id}
              onClick={() => !isCurrent && navigate(`/acompanhar/${r.id}`)}
              className={cn(
                "rounded-2xl border-2 p-3 transition-all",
                isCurrent
                  ? "border-primary bg-primary/5 cursor-default"
                  : "border-border bg-card hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-[0.98]"
              )}
            >
              {/* Header do card */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Prestador {idx + 1}{isCurrent ? ' · este' : ''}
                </span>
                {isCurrent && (
                  <span className="text-[9px] bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded-full">
                    ATUAL
                  </span>
                )}
              </div>

              {/* Avatar + Nome */}
              {r.provider_name ? (
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-black text-primary">{r.provider_name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground leading-tight truncate">{r.provider_name.split(' ')[0]}</p>
                    {r.estimated_arrival_minutes != null && !['concluido', 'cancelado', 'em_andamento'].includes(r.status) && (
                      <p className="text-[10px] text-muted-foreground">~{r.estimated_arrival_minutes} min</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground italic">Buscando...</p>
                </div>
              )}

              {/* Status badge */}
              <div className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] font-bold", cfg.color)}>
                <span>{cfg.emoji}</span>
                <span className="truncate">{cfg.label}</span>
              </div>

              {/* Linha viva pulsando se em movimento */}
              {r.status === 'a_caminho' && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                  </span>
                  <p className="text-[10px] text-orange-600 font-semibold">A caminho agora</p>
                </div>
              )}
              {r.status === 'em_andamento' && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <p className="text-[10px] text-primary font-semibold">Em execução agora</p>
                </div>
              )}

              {!isCurrent && (
                <p className="text-[10px] text-primary font-semibold mt-2">Ver detalhes →</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}