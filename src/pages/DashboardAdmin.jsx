import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock, DollarSign, Users, AlertTriangle, CheckCircle2, TrendingUp,
  ArrowRight, RefreshCw, Wifi, WifiOff, FileText, ShieldAlert, Star,
  Activity, Zap, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SERVICE_LABELS = {
  eletrica: 'Elétrica', hidraulica: 'Hidráulica', pintura: 'Pintura',
  montagem: 'Montagem', reparo_geral: 'Reparo Geral', alvenaria: 'Alvenaria',
  fechadura: 'Fechadura', ar_condicionado: 'Ar Condicionado', outros: 'Outros',
};

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      Ao vivo
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, sub, urgent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn('relative overflow-hidden border', urgent && 'border-red-300 shadow-red-100 shadow-md')}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">{label}</p>
              <p className={cn('text-3xl font-extrabold', color)}>{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
            <div className={cn('p-3 rounded-2xl', urgent ? 'bg-red-100' : 'bg-muted')}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
          </div>
          {urgent && (
            <div className="absolute top-2 right-2">
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Auth check
  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user || user.role !== 'admin') navigate('/');
    }).catch(() => navigate('/'));
  }, [navigate]);

  // Queries com refetch a cada 15s para tempo real
  const { data: requests = [], dataUpdatedAt } = useQuery({
    queryKey: ['dash-requests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date', 500),
    refetchInterval: 15000,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['dash-providers'],
    queryFn: () => base44.entities.Provider.list(),
    refetchInterval: 30000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['dash-tickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date', 100),
    refetchInterval: 20000,
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsub1 = base44.entities.ServiceRequest.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['dash-requests'] });
    });
    const unsub2 = base44.entities.Provider.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['dash-providers'] });
    });
    const unsub3 = base44.entities.Ticket.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['dash-tickets'] });
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [queryClient]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthRequests = requests.filter(r => new Date(r.created_date) >= startOfMonth);
    const monthCompleted = monthRequests.filter(r => r.status === 'concluido');
    const monthRevenue = monthCompleted.reduce((acc, r) => acc + (r.final_price || 0), 0);

    const pending = requests.filter(r => r.status === 'aguardando');
    const active = requests.filter(r => ['aceito', 'a_caminho', 'em_andamento'].includes(r.status));
    const pendingProviders = providers.filter(p => !p.is_approved && !p.is_rejected && !p.is_blocked);
    const onlineProviders = providers.filter(p => p.is_online);

    // Alertas de termos: clientes/prestadores sem aceite de termos nos últimos 30 dias
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const termsViolations = providers.filter(p =>
      p.is_approved && (!p.terms_accepted_at || new Date(p.terms_accepted_at) < thirtyDaysAgo)
    );

    // Reclamações abertas
    const openComplaints = tickets.filter(t => t.type === 'reclamacao' && t.status === 'aberto');

    // Receita dos últimos 7 dias (gráfico)
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayRev = requests
        .filter(r => r.status === 'concluido' && r.created_date?.startsWith(dateStr))
        .reduce((acc, r) => acc + (r.final_price || 0), 0);
      revenueTrend.push({
        day: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
        receita: parseFloat(dayRev.toFixed(2)),
      });
    }

    // Serviços ativos por tipo
    const typeCount = {};
    pending.forEach(r => {
      typeCount[r.service_type] = (typeCount[r.service_type] || 0) + 1;
    });
    const pendingByType = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      monthRevenue,
      monthCompleted: monthCompleted.length,
      pendingCount: pending.length,
      activeCount: active.length,
      pendingProviders: pendingProviders.length,
      pendingProvidersList: pendingProviders.slice(0, 5),
      onlineProviders: onlineProviders.length,
      termsViolations: termsViolations.length,
      termsViolationsList: termsViolations.slice(0, 5),
      openComplaints: openComplaints.length,
      openComplaintsList: openComplaints.slice(0, 5),
      revenueTrend,
      pendingByType,
      pendingList: pending.slice(0, 8),
    };
  }, [requests, providers, tickets]);

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR') : '—';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <LiveDot /> Atualizado às {lastUpdate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['dash-requests'] });
            queryClient.invalidateQueries({ queryKey: ['dash-providers'] });
            queryClient.invalidateQueries({ queryKey: ['dash-tickets'] });
          }}>
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
          <Link to="/admin">
            <Button size="sm" className="gap-2 rounded-xl">
              Painel Admin <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Alertas urgentes */}
      {(stats.pendingCount > 0 || stats.pendingProviders > 0 || stats.openComplaints > 0 || stats.termsViolations > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-yellow-800">{stats.pendingCount} serviço{stats.pendingCount > 1 ? 's' : ''} aguardando</p>
                <p className="text-xs text-yellow-600">Sem prestador atribuído</p>
              </div>
            </div>
          )}
          {stats.pendingProviders > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-800">{stats.pendingProviders} prestador{stats.pendingProviders > 1 ? 'es' : ''} pendente{stats.pendingProviders > 1 ? 's' : ''}</p>
                <p className="text-xs text-blue-600">Aguardando aprovação</p>
              </div>
            </div>
          )}
          {stats.openComplaints > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">{stats.openComplaints} reclamação{stats.openComplaints > 1 ? 'ões' : ''} aberta{stats.openComplaints > 1 ? 's' : ''}</p>
                <p className="text-xs text-red-600">Sem atendimento</p>
              </div>
            </div>
          )}
          {stats.termsViolations > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
              <ShieldAlert className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-orange-800">{stats.termsViolations} infração{stats.termsViolations > 1 ? 'ões' : ''} de termos</p>
                <p className="text-xs text-orange-600">Prestadores sem aceite</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Faturamento do Mês"
          value={`R$ ${stats.monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="text-primary"
          sub={`${stats.monthCompleted} serviços concluídos`}
        />
        <StatCard
          label="Serviços Pendentes"
          value={stats.pendingCount}
          icon={Clock}
          color="text-yellow-600"
          sub={`${stats.activeCount} em andamento`}
          urgent={stats.pendingCount > 5}
        />
        <StatCard
          label="Prestadores Online"
          value={stats.onlineProviders}
          icon={Zap}
          color="text-green-600"
          sub={`${stats.pendingProviders} aguardando aprovação`}
          urgent={stats.pendingProviders > 0}
        />
        <StatCard
          label="Alertas Ativos"
          value={stats.openComplaints + stats.termsViolations}
          icon={AlertTriangle}
          color="text-red-600"
          sub={`${stats.openComplaints} reclamações · ${stats.termsViolations} termos`}
          urgent={stats.openComplaints + stats.termsViolations > 0}
        />
      </div>

      {/* Gráfico de receita + Serviços pendentes por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" /> Receita — Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" style={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis style={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}
                  formatter={(v) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-yellow-600" /> Pendentes por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pendingByType.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum pendente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.pendingByType.map(({ type, count }) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (count / stats.pendingCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-6 text-right">{count}</span>
                    <span className="text-xs text-muted-foreground w-20 truncate">{SERVICE_LABELS[type] || type}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 3: Serviços pendentes + Prestadores aguardando + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Serviços pendentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" /> Aguardando Prestador
              </CardTitle>
              <Link to="/admin" className="text-xs text-primary hover:underline font-semibold">Ver todos</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.pendingList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum pendente 🎉</p>
            ) : stats.pendingList.map(req => (
              <div key={req.id} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{SERVICE_LABELS[req.service_type] || req.service_type}</p>
                  <p className="text-xs text-muted-foreground truncate">{req.client_name} · {req.city || req.address}</p>
                  <p className="text-xs text-muted-foreground">{new Date(req.created_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Prestadores aguardando aprovação */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Novos Prestadores
              </CardTitle>
              <Link to="/admin" className="text-xs text-primary hover:underline font-semibold">Aprovar</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.pendingProvidersList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum aguardando 🎉</p>
            ) : stats.pendingProvidersList.map(prov => (
              <div key={prov.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {prov.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{prov.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{prov.city} · {(prov.specialties || []).slice(0, 1).join(', ')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(prov.created_date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alertas: reclamações + infrações de termos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.openComplaintsList.map(ticket => (
              <div key={ticket.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-red-700">Reclamação aberta</p>
                  <p className="text-xs text-foreground truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">{ticket.client_name}</p>
                </div>
              </div>
            ))}
            {stats.termsViolationsList.map(prov => (
              <div key={prov.id} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                <FileText className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-orange-700">Termos não aceitos</p>
                  <p className="text-xs text-foreground truncate">{prov.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {prov.terms_accepted_at
                      ? `Último aceite: ${new Date(prov.terms_accepted_at).toLocaleDateString('pt-BR')}`
                      : 'Nunca aceitou'}
                  </p>
                </div>
              </div>
            ))}
            {stats.openComplaintsList.length === 0 && stats.termsViolationsList.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sem alertas ativos 🎉</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}