import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, Zap, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Users, Timer, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmt(minutes) {
  if (minutes == null) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const MetricCard = ({ icon: Icon, label, value, sub, color = 'text-foreground', bg = 'bg-card', trend, alert }) => (
  <div className={`${bg} border rounded-2xl p-4 flex flex-col gap-1 shadow-sm ${alert ? 'border-red-300' : 'border-border'}`}>
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${alert ? 'bg-red-100' : 'bg-muted'}`}>
        <Icon className={`w-4 h-4 ${alert ? 'text-red-600' : color}`} />
      </div>
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
    </div>
    <p className={`text-2xl font-black ${alert ? 'text-red-600' : color}`}>{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    {trend != null && (
      <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${trend > 0 ? 'text-red-500' : 'text-green-600'}`}>
        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(trend)}% vs. mês anterior
      </div>
    )}
  </div>
);

export default function ServiceMetrics() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['metrics-requests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date', 1000),
    refetchInterval: 30000,
  });

  const metrics = useMemo(() => {
    const completed = requests.filter(r => r.status === 'concluido');
    const cancelled = requests.filter(r => r.status === 'cancelado');
    const active = requests.filter(r => ['aguardando', 'aceito', 'a_caminho', 'em_andamento'].includes(r.status));

    // TMA — Tempo médio de aceite (created → aceito: proxy pela diferença updated_date quando status=aceito)
    // Usamos estimated_arrival_minutes como proxy do tempo de chegada cadastrado ao aceitar
    const arrivalMinutes = completed
      .map(r => r.estimated_arrival_minutes)
      .filter(v => v != null && v > 0 && v < 300);

    const tmc = avg(arrivalMinutes);
    const tmcMediana = median(arrivalMinutes);

    // Atrasos: chamados com estimated_arrival_minutes > 30 min
    const atrasoCount = arrivalMinutes.filter(v => v > 30).length;
    const atrasoPercent = arrivalMinutes.length > 0 ? Math.round((atrasoCount / arrivalMinutes.length) * 100) : 0;

    // Taxa de cancelamento
    const cancelRate = requests.length > 0 ? ((cancelled.length / requests.length) * 100).toFixed(1) : 0;

    // Taxa de conclusão
    const conclusionRate = requests.length > 0 ? ((completed.length / requests.length) * 100).toFixed(1) : 0;

    // Ticket médio
    const prices = completed.filter(r => r.final_price > 0).map(r => r.final_price);
    const ticketMedio = avg(prices);

    // Distribuição por hora do dia
    const byHour = Array.from({ length: 24 }, (_, h) => ({ hora: `${h}h`, chamados: 0 }));
    requests.forEach(r => {
      if (!r.created_date) return;
      const h = new Date(r.created_date).getHours();
      byHour[h].chamados++;
    });

    // Distribuição por tipo de serviço
    const byType = {};
    completed.forEach(r => {
      const t = r.service_type || 'outros';
      byType[t] = (byType[t] || 0) + 1;
    });
    const topTypes = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    // Chamados nos últimos 7 dias por dia
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).toISOString();
      const dayEnd = new Date(d.setHours(23, 59, 59, 999)).toISOString();
      const count = requests.filter(r => r.created_date >= dayStart && r.created_date <= dayEnd).length;
      last7.push({ dia: dateStr, chamados: count });
    }

    // Prestadores com maior volume
    const providerVolume = {};
    completed.forEach(r => {
      if (!r.provider_name) return;
      providerVolume[r.provider_name] = (providerVolume[r.provider_name] || 0) + 1;
    });
    const topProviders = Object.entries(providerVolume)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      tmc, tmcMediana, atrasoCount, atrasoPercent,
      cancelRate, conclusionRate, ticketMedio,
      byHour, topTypes, last7, topProviders,
      totalCompleted: completed.length,
      totalCancelled: cancelled.length,
      totalActive: active.length,
      totalRequests: requests.length,
    };
  }, [requests]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  const SERVICE_LABELS = {
    eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
    reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
    fechadura: "Fechadura", ar_condicionado: "Ar Cond.", desentupimento: "Desentup.",
    reboque: "Reboque", troca_pneu: "Pneu", outros: "Outros",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Métricas de Atendimento
        </h2>
        <p className="text-xs text-muted-foreground">Baseado em {metrics.totalRequests} chamados registrados</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={Timer}
          label="TMC Médio"
          value={fmt(metrics.tmc)}
          sub={`Mediana: ${fmt(metrics.tmcMediana)}`}
          color="text-blue-600"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Atrasos (>30 min)"
          value={`${metrics.atrasoPercent}%`}
          sub={`${metrics.atrasoCount} chamados`}
          color="text-orange-600"
          alert={metrics.atrasoPercent > 30}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Taxa Conclusão"
          value={`${metrics.conclusionRate}%`}
          sub={`${metrics.totalCompleted} concluídos`}
          color="text-green-600"
        />
        <MetricCard
          icon={Zap}
          label="Taxa Cancelamento"
          value={`${metrics.cancelRate}%`}
          sub={`${metrics.totalCancelled} cancelados`}
          color="text-red-600"
          alert={parseFloat(metrics.cancelRate) > 20}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          icon={TrendingUp}
          label="Ticket Médio"
          value={metrics.ticketMedio ? `R$ ${Math.round(metrics.ticketMedio)}` : '—'}
          sub="Serviços concluídos"
          color="text-primary"
        />
        <MetricCard
          icon={Activity}
          label="Chamados Ativos"
          value={metrics.totalActive}
          sub="Em andamento agora"
          color="text-yellow-600"
        />
        <MetricCard
          icon={Users}
          label="Total de Chamados"
          value={metrics.totalRequests}
          sub="Histórico completo"
          color="text-foreground"
        />
      </div>

      {/* Chamados por hora do dia */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-sm font-bold text-foreground mb-3">📊 Chamados por Hora do Dia</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={metrics.byHour} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={3} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="chamados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chamados últimos 7 dias */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-sm font-bold text-foreground mb-3">📅 Últimos 7 Dias</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={metrics.last7} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="chamados" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top tipos de serviço + Top prestadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.topTypes.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-3">🔧 Top Serviços (concluídos)</p>
            <div className="space-y-2">
              {metrics.topTypes.map((t, i) => (
                <div key={t.name} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-foreground">{SERVICE_LABELS[t.name] || t.name}</span>
                      <span className="text-muted-foreground">{t.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(t.value / metrics.topTypes[0].value) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.topProviders.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-3">⭐ Top Prestadores</p>
            <div className="space-y-2">
              {metrics.topProviders.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-foreground truncate max-w-[130px]">{name}</span>
                      <span className="text-muted-foreground">{count} serv.</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(count / metrics.topProviders[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerta de desempenho */}
      {(metrics.atrasoPercent > 30 || parseFloat(metrics.cancelRate) > 20) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-800">⚠️ Atenção: indicadores críticos</p>
            {metrics.atrasoPercent > 30 && (
              <p className="text-xs text-red-700">• {metrics.atrasoPercent}% dos atendimentos têm tempo de chegada acima de 30 min</p>
            )}
            {parseFloat(metrics.cancelRate) > 20 && (
              <p className="text-xs text-red-700">• Taxa de cancelamento de {metrics.cancelRate}% está acima do recomendado (20%)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}