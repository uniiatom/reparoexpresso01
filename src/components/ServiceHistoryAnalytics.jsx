import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingDown, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from "@/lib/utils";

export default function ServiceHistoryAnalytics({ clientEmail, currentServiceType, currentTotal }) {
  // Busca serviços concluídos do cliente
  const { data: completedServices = [], isLoading } = useQuery({
    queryKey: ['completed-services', clientEmail],
    queryFn: () => base44.entities.ServiceRequest.filter({
      created_by: clientEmail,
      status: 'concluido'
    }, '-updated_date', 100),
    enabled: !!clientEmail,
  });

  // Calcula estatísticas
  const analytics = useMemo(() => {
    if (!completedServices.length) return null;

    // Agrupa por tipo de serviço
    const byServiceType = completedServices.reduce((acc, service) => {
      const type = service.service_type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalCost: 0,
          costs: [],
          laborCosts: [],
          withLabor: 0,
          withParts: 0
        };
      }
      acc[type].count++;
      acc[type].costs.push(service.final_price || service.estimated_price || 0);
      
      // Tenta extrair custo de mão de obra se disponível (campo customizado)
      if (service.labor_cost) {
        acc[type].laborCosts.push(service.labor_cost);
        acc[type].withLabor++;
      }
      if (service.parts_cost) {
        acc[type].withParts++;
      }
      
      acc[type].totalCost += (service.final_price || service.estimated_price || 0);
      return acc;
    }, {});

    // Calcula médias
    const serviceStats = Object.entries(byServiceType).map(([type, data]) => ({
      type,
      count: data.count,
      avgCost: data.totalCost / data.count,
      minCost: Math.min(...data.costs),
      maxCost: Math.max(...data.costs),
      avgLabor: data.laborCosts.length > 0 
        ? data.laborCosts.reduce((a, b) => a + b, 0) / data.laborCosts.length 
        : 0,
      withLaborCount: data.withLabor,
      withPartsCount: data.withParts
    })).sort((a, b) => b.count - a.count);

    // Estatísticas gerais
    const allCosts = completedServices
      .map(s => s.final_price || s.estimated_price || 0)
      .filter(c => c > 0);

    const totalSpent = allCosts.reduce((a, b) => a + b, 0);
    const avgSpent = totalSpent / allCosts.length;
    const minSpent = Math.min(...allCosts);
    const maxSpent = Math.max(...allCosts);

    // Dados para gráfico temporal
    const timelineData = completedServices
      .map(s => ({
        date: new Date(s.updated_date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        cost: s.final_price || s.estimated_price || 0,
        service: s.service_type
      }))
      .reverse()
      .slice(-12); // Últimos 12 serviços

    return {
      serviceStats,
      totalSpent,
      avgSpent,
      minSpent,
      maxSpent,
      totalServices: completedServices.length,
      timelineData,
      mostCommon: serviceStats[0]
    };
  }, [completedServices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-muted/50 rounded-2xl p-6 text-center">
        <p className="text-muted-foreground">Nenhum serviço concluído ainda. Histórico aparecerá aqui.</p>
      </div>
    );
  }

  // Encontra estatísticas do serviço atual
  const currentServiceStats = analytics.serviceStats.find(s => s.type === currentServiceType);

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">SERVIÇOS REALIZADOS</p>
                <p className="text-2xl font-black text-foreground">{analytics.totalServices}</p>
              </div>
              <BarChart3 className="w-5 h-5 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">GASTO TOTAL</p>
                <p className="text-2xl font-black text-foreground">
                  R$ {analytics.totalSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">TICKET MÉDIO</p>
                <p className="text-2xl font-black text-foreground">
                  R$ {analytics.avgSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">FAIXA DE PREÇO</p>
                <p className="text-sm font-bold text-foreground">
                  R$ {analytics.minSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} — R$ {analytics.maxSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <TrendingDown className="w-5 h-5 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução de Custos */}
      {analytics.timelineData.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-foreground mb-4 text-sm">📈 Evolução de Custos (Últimos Serviços)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#2d8659" 
                  strokeWidth={2}
                  dot={{ fill: '#2d8659', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Comparação com Serviço Atual */}
      {currentTotal && currentServiceStats && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <h3 className="font-bold text-foreground mb-4 text-sm">🎯 Comparação com Referência de Mercado</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Seu Serviço Atual</p>
                  <p className="text-lg font-bold text-foreground">R$ {currentTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">1º orçamento</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Média de Preço ({currentServiceType})</p>
                  <p className="text-lg font-bold text-primary">R$ {currentServiceStats.avgCost.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{currentServiceStats.count} serviços</p>
                </div>
              </div>

              {/* Análise de Diferença */}
              {currentTotal && currentServiceStats.avgCost > 0 && (
                <div className={cn(
                  "p-3 rounded-lg text-sm font-semibold",
                  currentTotal > currentServiceStats.avgCost
                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                )}>
                  {currentTotal > currentServiceStats.avgCost ? (
                    <div>
                      ⚠️ Seu orçamento é <strong>{((currentTotal / currentServiceStats.avgCost - 1) * 100).toFixed(0)}% acima</strong> da média do mercado
                    </div>
                  ) : (
                    <div>
                      ✅ Seu orçamento é <strong>{((1 - currentTotal / currentServiceStats.avgCost) * 100).toFixed(0)}% abaixo</strong> da média do mercado
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-white rounded-lg border border-border text-center">
                  <p className="text-muted-foreground font-semibold">Mín. Histórico</p>
                  <p className="font-bold text-foreground">R$ {currentServiceStats.minCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-border text-center">
                  <p className="text-muted-foreground font-semibold">Máx. Histórico</p>
                  <p className="font-bold text-foreground">R$ {currentServiceStats.maxCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Preços por Tipo de Serviço */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold text-foreground mb-4 text-sm">📊 Histórico por Tipo de Serviço</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analytics.serviceStats.map((stat, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  currentServiceType === stat.type
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted/50 border-border hover:bg-muted/70"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-foreground text-sm">{stat.type}</p>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
                    {stat.count}x
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground font-semibold">Médio</p>
                    <p className="font-bold text-foreground">R$ {stat.avgCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">Mínimo</p>
                    <p className="font-bold text-green-600">R$ {stat.minCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">Máximo</p>
                    <p className="font-bold text-orange-600">R$ {stat.maxCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
                {stat.avgLabor > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    👨‍🔧 Mão de obra média: R$ {stat.avgLabor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}