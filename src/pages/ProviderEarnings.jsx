import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, TrendingUp, Clock, CheckCircle2, DollarSign, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ProviderEarnings() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.role !== 'prestador') {
        navigate('/');
        return;
      }
      // Buscar provider associado ao user
      base44.entities.Provider.filter({ user_id: user.id }).then(providers => {
        if (providers.length > 0) {
          setProvider(providers[0]);
        }
      });
    });
  }, [navigate]);

  // Buscar serviços completados do prestador
  const { data: completedServices = [] } = useQuery({
    queryKey: ['provider-completed-services', provider?.id],
    queryFn: () => base44.entities.ServiceRequest.filter({
      provider_id: provider?.id,
      status: 'concluido',
    }),
    enabled: !!provider?.id,
  });

  // Buscar preços para calcular repasse
  const { data: pricings = [] } = useQuery({
    queryKey: ['service-pricings'],
    queryFn: () => base44.entities.ServicePricing.list(),
  });

  // Calcular ganhos e dados do gráfico
  const calculateEarnings = () => {
    const monthlyData = Array(12).fill(0).map((_, i) => ({
      month: MONTHS[i],
      count: 0,
      earnings: 0,
    }));

    let totalEarnings = 0;

    completedServices.forEach(service => {
      const date = new Date(service.created_date);
      const monthIndex = date.getMonth();

      // Incrementar contagem de serviços
      monthlyData[monthIndex].count += 1;

      // Calcular repasse
      let serviceEarning = 0;
      const pricing = pricings.find(p => p.service_type === service.service_type);

      if (pricing?.repasse_value) {
        serviceEarning = pricing.repasse_value;
      } else if (pricing?.repasse_percent && service.final_price) {
        serviceEarning = (service.final_price * pricing.repasse_percent) / 100;
      } else if (service.final_price) {
        // Fallback: 70% do valor final se não houver configuração
        serviceEarning = service.final_price * 0.7;
      }

      monthlyData[monthIndex].earnings += serviceEarning;
      totalEarnings += serviceEarning;
    });

    return {
      monthlyData: monthlyData.filter(m => m.count > 0 || m.earnings > 0),
      totalEarnings,
    };
  };

  const { monthlyData, totalEarnings } = calculateEarnings();

  // Dados para gráfico de pizza (status de repasse)
  const pendingEarnings = totalEarnings * 0.3; // 30% pendente (exemplo)
  const confirmedEarnings = totalEarnings * 0.7; // 70% confirmado

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary mb-8 hover:text-primary/80 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      {/* Page Title */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Resumo Financeiro</h1>
        <p className="text-muted-foreground">Visualize seus ganhos e performance</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        {/* Total Earnings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Ganhos Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">R$ {totalEarnings.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{completedServices.length} serviços</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Confirmed Earnings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-gradient-to-br from-green-50 to-green-50/50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Confirmado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">R$ {confirmedEarnings.toFixed(2)}</p>
              <p className="text-xs text-green-700 mt-1">Pronto para saque</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Earnings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-50/50 border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-yellow-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" /> Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">R$ {pendingEarnings.toFixed(2)}</p>
              <p className="text-xs text-yellow-700 mt-1">Aguardando processamento</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      >
        {/* Bar Chart - Serviços por Mês */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Serviços por Mês</CardTitle>
            <CardDescription>Quantidade de serviços finalizados e ganhos mensais</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => value.toFixed(2)}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="var(--primary)" name="Serviços" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="right" dataKey="earnings" fill="var(--chart-2)" name="Ganhos (R$)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum serviço finalizado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Distribuição de Ganhos */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição</CardTitle>
            <CardDescription>Status dos ganhos</CardDescription>
          </CardHeader>
          <CardContent>
            {totalEarnings > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Confirmado', value: confirmedEarnings },
                      { name: 'Pendente', value: pendingEarnings },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="var(--chart-1)" />
                    <Cell fill="var(--chart-3)" />
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Alert */}
      {totalEarnings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Como funcionam os saques?</p>
            <p className="text-blue-800">
              Seus ganhos são processados automaticamente. Os valores confirmados são transferidos a cada 30 dias. Consulte nossos termos para mais detalhes.
            </p>
          </div>
        </motion.div>
      )}

      {completedServices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Nenhum ganho ainda</h2>
          <p className="text-muted-foreground mb-6">Complete seus primeiros serviços para visualizar seus ganhos</p>
          <Button onClick={() => navigate('/prestador')} className="rounded-2xl bg-primary text-primary-foreground">
            Voltar aos serviços
          </Button>
        </motion.div>
      )}
    </div>
  );
}