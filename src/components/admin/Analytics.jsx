import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, AlertCircle, Star, Users, Briefcase, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const { data: requests = [] } = useQuery({
    queryKey: ['all-requests-analytics'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['all-providers-analytics'],
    queryFn: () => base44.entities.Provider.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['all-reviews-analytics'],
    queryFn: () => base44.entities.Review.list('-created_date'),
  });

  const analytics = useMemo(() => {
    const completed = requests.filter(r => r.status === 'concluido');
    const cancelled = requests.filter(r => r.status === 'cancelado');
    const totalRevenue = completed.reduce((acc, r) => acc + (r.final_price || 0), 0);
    const cancellationRate = requests.length > 0 ? ((cancelled.length / requests.length) * 100).toFixed(2) : 0;

    // Top providers by reviews
    const providerReviews = {};
    reviews.forEach(review => {
      const key = review.provider_id || review.professional_id;
      if (!providerReviews[key]) {
        providerReviews[key] = { ratings: [], count: 0 };
      }
      providerReviews[key].ratings.push(review.overall_rating);
      providerReviews[key].count += 1;
    });

    const topProviders = Object.entries(providerReviews)
      .map(([id, data]) => {
        const provider = providers.find(p => p.id === id);
        const avgRating = data.ratings.length > 0
          ? (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1)
          : 0;
        return {
          id,
          name: provider?.name || 'Desconhecido',
          rating: parseFloat(avgRating),
          reviews: data.count,
        };
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    // Service volume by type
    const serviceVolume = {};
    requests.forEach(req => {
      serviceVolume[req.service_type] = (serviceVolume[req.service_type] || 0) + 1;
    });

    const serviceChartData = Object.entries(serviceVolume)
      .map(([type, count]) => ({
        name: type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1),
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Revenue trend (last 7 days)
    const today = new Date();
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayRevenue = requests
        .filter(r => r.status === 'concluido' && r.created_date?.startsWith(dateStr))
        .reduce((acc, r) => acc + (r.final_price || 0), 0);
      revenueTrend.push({
        date: date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: parseFloat(dayRevenue.toFixed(2)),
      });
    }

    // Status distribution
    const statusData = [
      { name: 'Concluído', value: completed.length, color: '#10b981' },
      { name: 'Cancelado', value: cancelled.length, color: '#ef4444' },
      { name: 'Em progresso', value: requests.filter(r => ['aguardando', 'aceito', 'a_caminho', 'em_andamento'].includes(r.status)).length, color: '#f59e0b' },
    ].filter(s => s.value > 0);

    return {
      totalRequests: requests.length,
      completedRequests: completed.length,
      cancelledRequests: cancelled.length,
      totalRevenue: totalRevenue.toFixed(2),
      cancellationRate,
      averageServiceValue: requests.length > 0 ? (totalRevenue / completed.length || 0).toFixed(2) : 0,
      topProviders,
      serviceChartData,
      revenueTrend,
      statusData,
      activeProviders: providers.filter(p => p.is_online).length,
      approvedProviders: providers.filter(p => p.is_approved).length,
    };
  }, [requests, providers, reviews]);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

  return (
    <div className="space-y-6">


      {/* Top Providers */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Prestadores Mais Bem Avaliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topProviders.length > 0 ? (
                analytics.topProviders.map((provider, idx) => (
                  <div key={provider.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-1 rounded">#{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{provider.name}</p>
                        <p className="text-xs text-muted-foreground">{provider.reviews} avaliações</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-4 h-4',
                              i < Math.floor(provider.rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-primary text-sm">{provider.rating}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">Sem avaliações ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" /> Receita (Últimos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: 12 }} />
                  <YAxis stroke="var(--muted-foreground)" style={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Service Volume */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Volume por Tipo de Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.serviceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" style={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="var(--muted-foreground)" style={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="value" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Distribution */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} serviço(s)`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Provider Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-primary" /> Status dos Prestadores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Aprovados', value: analytics.approvedProviders, color: 'bg-green-100 text-green-700' },
                { label: 'Online agora', value: analytics.activeProviders, color: 'bg-primary/10 text-primary' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-semibold text-foreground">{stat.label}</span>
                  <Badge className={`${stat.color} border-0 text-lg font-bold`}>{stat.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}