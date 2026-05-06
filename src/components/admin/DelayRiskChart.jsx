import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { AlertTriangle, ChevronDown, ChevronUp, TrendingUp, Clock, User, ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cálculo do score de risco de atraso por serviço (0–100)
function calcRisk(service, now) {
  let risk = 0;

  // Serviços sem prestador = risco máximo
  if (!service.provider_id) return 95;

  // Baseado no status
  const STATUS_RISK = {
    aguardando: 60,
    aceito: 20,
    a_caminho: 10,
    em_andamento: 5,
    agendado: 30,
    concluido: 0,
    cancelado: 0,
  };
  risk = STATUS_RISK[service.status] ?? 30;

  // Serviço agendado: quanto mais perto sem confirmação, mais risco
  if (service.scheduled_date && service.scheduled_time) {
    const scheduled = new Date(`${service.scheduled_date}T${service.scheduled_time}`);
    const diffMs = scheduled - now;
    const diffHours = diffMs / 3600000;

    if (diffHours < 0) {
      // Já passou do horário agendado
      risk = Math.min(100, risk + 60);
    } else if (diffHours < 1) {
      risk = Math.min(100, risk + 40);
    } else if (diffHours < 3) {
      risk = Math.min(100, risk + 20);
    } else if (diffHours < 6) {
      risk = Math.min(100, risk + 10);
    }
  }

  // Serviço imediato há muito tempo em 'aceito' ou 'a_caminho'
  if (['aceito', 'a_caminho'].includes(service.status) && service.updated_date) {
    const updatedAt = new Date(service.updated_date);
    const elapsedMin = (now - updatedAt) / 60000;
    if (elapsedMin > 60) risk = Math.min(100, risk + 30);
    else if (elapsedMin > 30) risk = Math.min(100, risk + 15);
  }

  return Math.round(Math.min(100, Math.max(0, risk)));
}

function getRiskLevel(score) {
  if (score >= 70) return { label: 'Alto', color: '#ef4444', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' };
  if (score >= 40) return { label: 'Médio', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' };
  return { label: 'Baixo', color: '#22c55e', bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' };
}

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Cond.",
  limpeza_caixa_dagua: "Caixa D'água", limpeza_calha: "Calha",
  desentupimento: "Desentup.", reboque: "Reboque", outros: "Outros",
};

// Tooltip customizado do gráfico
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const level = getRiskLevel(d.risk);
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-bold text-foreground mb-1">{d.label}</p>
      <p className="text-muted-foreground">{d.client}</p>
      <p className="text-muted-foreground">{d.provider || 'Sem prestador'}</p>
      {d.scheduledAt && <p className="text-muted-foreground mt-1">⏰ {d.scheduledAt}</p>}
      <div className={cn('mt-2 px-2 py-1 rounded-lg font-semibold', level.bg, level.text)}>
        Risco {level.label}: {d.risk}%
      </div>
    </div>
  );
}

export default function DelayRiskChart({ services, providers, onSelectService }) {
  const [expanded, setExpanded] = useState(true);
  const now = useMemo(() => new Date(), []);

  const providerMap = useMemo(() =>
    Object.fromEntries((providers || []).map(p => [p.id, p])),
    [providers]
  );

  // Calcula risco para os serviços ativos (exclui concluídos e cancelados)
  const riskData = useMemo(() => {
    return services
      .filter(s => !['concluido', 'cancelado'].includes(s.status))
      .map(s => {
        const risk = calcRisk(s, now);
        const provider = providerMap[s.provider_id];
        let scheduledAt = null;
        if (s.scheduled_date) {
          scheduledAt = `${format(new Date(s.scheduled_date + 'T00:00'), "dd/MM", { locale: ptBR })}${s.scheduled_time ? ` ${s.scheduled_time}` : ''}`;
        }
        return {
          id: s.id,
          service: s,
          label: SERVICE_LABELS[s.service_type] || s.service_type,
          client: s.client_name,
          provider: provider?.name || s.provider_name || null,
          scheduledAt,
          status: s.status,
          risk,
        };
      })
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 20); // Limita para não poluir o gráfico
  }, [services, providerMap, now]);

  const highRisk = riskData.filter(d => d.risk >= 70);
  const medRisk = riskData.filter(d => d.risk >= 40 && d.risk < 70);

  if (riskData.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header colapsável */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Mapa de Risco de Atraso</p>
            <p className="text-xs text-muted-foreground">
              {highRisk.length > 0 && (
                <span className="text-red-600 font-semibold">{highRisk.length} alto risco</span>
              )}
              {highRisk.length > 0 && medRisk.length > 0 && ' · '}
              {medRisk.length > 0 && (
                <span className="text-amber-600 font-semibold">{medRisk.length} médio risco</span>
              )}
              {highRisk.length === 0 && medRisk.length === 0 && (
                <span className="text-green-600 font-semibold">Todos em dia ✓</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {highRisk.length > 0 && (
            <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {highRisk.length}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Gráfico de barras */}
          <div className="pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskData} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5}
                  label={{ value: 'Alto', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
                  label={{ value: 'Médio', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                <Bar dataKey="risk" radius={[4, 4, 0, 0]} maxBarSize={32}
                  onClick={(data) => onSelectService && onSelectService(data.service)}>
                  {riskData.map((entry, index) => (
                    <Cell key={index} fill={getRiskLevel(entry.risk).color} cursor="pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards de alto risco */}
          {highRisk.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Alto Risco — Ação necessária
              </p>
              <div className="space-y-2">
                {highRisk.map(d => (
                  <RiskCard key={d.id} data={d} onSelect={onSelectService} />
                ))}
              </div>
            </div>
          )}

          {/* Cards de médio risco */}
          {medRisk.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Médio Risco — Monitorar
              </p>
              <div className="space-y-2">
                {medRisk.map(d => (
                  <RiskCard key={d.id} data={d} onSelect={onSelectService} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RiskCard({ data, onSelect }) {
  const level = getRiskLevel(data.risk);
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3', level.bg, level.border)}>
      {/* Score */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0', level.bg, level.text)}>
        {data.risk}%
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-bold truncate', level.text)}>
          {data.label} · {data.client}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {data.provider ? (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="w-3 h-3" /> {data.provider}
            </span>
          ) : (
            <span className="text-[10px] text-red-600 font-semibold">⚠ Sem prestador</span>
          )}
          {data.scheduledAt && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="w-3 h-3" /> {data.scheduledAt}
            </span>
          )}
          <span className={cn('text-[10px] font-medium capitalize px-1.5 py-0.5 rounded-full', level.bg, level.text)}>
            {data.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className={cn('flex-shrink-0 rounded-xl h-7 text-xs gap-1 px-2', level.border)}
        onClick={() => onSelect && onSelect(data.service)}
      >
        <ArrowRight className="w-3 h-3" /> Agir
      </Button>
    </div>
  );
}