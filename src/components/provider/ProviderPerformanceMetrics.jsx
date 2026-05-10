import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingUp, Clock, DollarSign, Zap } from 'lucide-react';

export default function ProviderPerformanceMetrics({ providerId }) {
  const [monthlyData, setMonthlyData] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [metrics, setMetrics] = useState({
    avgResponseTime: 0,
    estimatedRevenue: 0,
    completedServices: 0,
    acceptanceRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [providerId]);

  const loadMetrics = async () => {
    try {
      // Busca serviços do prestador nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const services = await base44.entities.ServiceRequest.filter({
        provider_id: providerId,
        status: { $in: ['concluido', 'aceito', 'a_caminho', 'em_andamento'] }
      }, '-created_date', 100);

      // Processar dados para gráficos
      processMonthlyData(services);
      processVolumeData(services);
      calculateMetrics(services);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      setLoading(false);
    }
  };

  const processMonthlyData = (services) => {
    const monthlyRevenue = {};
    
    services.forEach(service => {
      const date = new Date(service.created_date);
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { month: monthKey, revenue: 0, count: 0 };
      }
      
      monthlyRevenue[monthKey].revenue += service.final_price || service.estimated_price || 0;
      monthlyRevenue[monthKey].count += 1;
    });

    const sorted = Object.values(monthlyRevenue)
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .slice(-6); // Últimos 6 meses

    setMonthlyData(sorted);
  };

  const processVolumeData = (services) => {
    const statusCount = {
      concluido: 0,
      aceito: 0,
      a_caminho: 0,
      em_andamento: 0,
    };

    services.forEach(service => {
      if (statusCount.hasOwnProperty(service.status)) {
        statusCount[service.status] += 1;
      }
    });

    const volume = [
      { name: 'Concluídos', value: statusCount.concluido, fill: '#10b981' },
      { name: 'Em Andamento', value: statusCount.em_andamento, fill: '#f59e0b' },
      { name: 'A Caminho', value: statusCount.a_caminho, fill: '#3b82f6' },
      { name: 'Aceitos', value: statusCount.aceito, fill: '#8b5cf6' },
    ];

    setVolumeData(volume);
  };

  const calculateMetrics = (services) => {
    const completedServices = services.filter(s => s.status === 'concluido').length;
    const totalServices = services.length;
    const acceptanceRate = totalServices > 0 ? (completedServices / totalServices * 100).toFixed(1) : 0;

    let totalResponseTime = 0;
    let responseTimes = 0;

    services.forEach(service => {
      if (service.status !== 'aguardando') {
        // Calcula tempo de resposta em minutos
        const createdTime = new Date(service.created_date).getTime();
        const acceptedTime = service.updated_date ? new Date(service.updated_date).getTime() : createdTime;
        const timeDiff = (acceptedTime - createdTime) / (1000 * 60);
        
        if (timeDiff > 0) {
          totalResponseTime += timeDiff;
          responseTimes += 1;
        }
      }
    });

    const avgResponseTime = responseTimes > 0 ? (totalResponseTime / responseTimes).toFixed(0) : 0;

    const estimatedRevenue = services
      .filter(s => s.status === 'concluido')
      .reduce((sum, s) => sum + (s.final_price || s.estimated_price || 0), 0)
      .toFixed(2);

    setMetrics({
      avgResponseTime: parseInt(avgResponseTime),
      estimatedRevenue: parseFloat(estimatedRevenue),
      completedServices,
      acceptanceRate: parseFloat(acceptanceRate),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Serviços Concluídos</span>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{metrics.completedServices}</p>
          <p className="text-xs text-muted-foreground mt-1">últimos 30 dias</p>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Taxa de Conclusão</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">{metrics.acceptanceRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">serviços concluídos</p>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tempo Médio Resposta</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{metrics.avgResponseTime}m</p>
          <p className="text-xs text-muted-foreground mt-1">minutos</p>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receita Estimada</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">R$ {metrics.estimatedRevenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">últimos 30 dias</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita Mensal */}
        <Card className="p-6 border border-border rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4">Receita Mensal</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                  formatter={(value) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#fbbf24" 
                  strokeWidth={3}
                  dot={{ fill: '#fbbf24', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Receita (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </Card>

        {/* Volume por Status */}
        <Card className="p-6 border border-border rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4">Volume de Atendimentos</h3>
          {volumeData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={volumeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {volumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} serviços`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </Card>

        {/* Serviços por Mês */}
        <Card className="p-6 border border-border rounded-2xl lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Volume de Serviços por Mês</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Quantidade de Serviços" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}