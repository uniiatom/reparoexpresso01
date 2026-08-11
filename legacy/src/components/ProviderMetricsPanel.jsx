import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Clock, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProviderMetricsPanel({ providerId }) {
  const [metrics, setMetrics] = useState({
    approvalRate: 0,
    avgCompletionTime: 0,
    avgRating: 0,
    totalJobs: 0,
    totalReviews: 0,
    approvedCharges: 0,
    rejectedCharges: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) return;
    calculateMetrics();
  }, [providerId]);

  const calculateMetrics = async () => {
    try {
      setLoading(true);

      // Busca todos os serviços do prestador
      const services = await base44.entities.ServiceRequest.filter(
        { provider_id: providerId, status: 'concluido' },
        '-created_date',
        500
      );

      // Busca avaliações do prestador
      const reviews = await base44.entities.Review.filter(
        { provider_id: providerId },
        '-created_date',
        500
      );

      // Calcula taxa de aprovação de orçamentos extras
      let approvedCharges = 0;
      let rejectedCharges = 0;
      let totalCompletionMs = 0;

      services.forEach(service => {
        // Verifica histórico de preços para orçamentos extras aprovados/rejeitados
        if (service.final_price && service.estimated_price) {
          if (service.final_price > service.estimated_price) {
            approvedCharges++;
          }
        }

        // Calcula tempo de conclusão
        if (service.created_date && service.updated_date) {
          const createdTime = new Date(service.created_date).getTime();
          const completedTime = new Date(service.updated_date).getTime();
          totalCompletionMs += (completedTime - createdTime);
        }
      });

      // Calcula média de avaliação
      let sumRating = 0;
      reviews.forEach(review => {
        sumRating += review.overall_rating || 0;
      });
      const avgRating = reviews.length > 0 ? (sumRating / reviews.length).toFixed(1) : 0;

      // Calcula tempo médio de conclusão em horas
      const avgCompletionHours = services.length > 0
        ? Math.round((totalCompletionMs / services.length) / (1000 * 60 * 60))
        : 0;

      // Calcula taxa de aprovação (extras aprovados / total serviços com potencial de extras)
      const totalWithExtras = approvedCharges + rejectedCharges;
      const approvalRate = totalWithExtras > 0
        ? Math.round((approvedCharges / totalWithExtras) * 100)
        : 0;

      setMetrics({
        approvalRate,
        avgCompletionTime: avgCompletionHours,
        avgRating: parseFloat(avgRating),
        totalJobs: services.length,
        totalReviews: reviews.length,
        approvedCharges,
        rejectedCharges
      });
    } catch (error) {
      console.error('Erro ao calcular métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determina a cor baseada no valor
  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getApprovalColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTimeColor = (hours) => {
    if (hours <= 24) return 'text-green-600';
    if (hours <= 48) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="rounded-3xl p-6 border border-border bg-card mb-6 text-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Cabeçalho */}
      <div className="rounded-3xl p-5 border border-border bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Suas Métricas</h3>
        </div>
        <p className="text-sm text-muted-foreground">Acompanhe seu desempenho e melhore continuamente</p>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Taxa de Aprovação de Orçamentos */}
        <div className="rounded-3xl p-5 border border-border bg-card hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Taxa de Aprovação</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-black", getApprovalColor(metrics.approvalRate))}>
                  {metrics.approvalRate}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {metrics.approvedCharges} aprovados · {metrics.rejectedCharges} rejeitados
          </p>
          <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${metrics.approvalRate}%` }}
            />
          </div>
        </div>

        {/* Tempo Médio de Conclusão */}
        <div className="rounded-3xl p-5 border border-border bg-card hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tempo Médio</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-black", getTimeColor(metrics.avgCompletionTime))}>
                  {metrics.avgCompletionTime}h
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Da criação à conclusão
          </p>
          <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (24 / 48) * 100)}%` }}
            />
          </div>
        </div>

        {/* Avaliação Média */}
        <div className="rounded-3xl p-5 border border-border bg-card hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Avaliação Média</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-black", getRatingColor(metrics.avgRating))}>
                  {metrics.avgRating}
                </span>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 text-yellow-600 fill-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {metrics.totalReviews} avaliação{metrics.totalReviews !== 1 ? 's' : ''}
          </p>
          <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-500"
              style={{ width: `${(metrics.avgRating / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dicas de Melhoria */}
      <div className="rounded-3xl p-5 border border-amber-200 bg-amber-50">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-amber-800">
            💡
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 mb-2">Dicas para melhorar:</p>
            <ul className="text-sm text-amber-800 space-y-1">
              {metrics.approvalRate < 80 && (
                <li>• Revise seus orçamentos extras — aumente a taxa de aprovação com estimativas mais precisas</li>
              )}
              {metrics.avgCompletionTime > 48 && (
                <li>• Otimize o tempo de conclusão — serviços mais rápidos melhoram a satisfação</li>
              )}
              {metrics.avgRating < 4.0 && (
                <li>• Invista em qualidade e comunicação — avaliações altas atraem mais clientes</li>
              )}
              {metrics.totalReviews < 5 && (
                <li>• Complete mais serviços para acumular avaliações e construir sua reputação</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Resumo de Serviços */}
      <div className="rounded-3xl p-5 border border-border bg-card">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resumo</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{metrics.totalJobs}</p>
            <p className="text-xs text-muted-foreground mt-1">Serviços concluídos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{metrics.totalReviews}</p>
            <p className="text-xs text-muted-foreground mt-1">Avaliações recebidas</p>
          </div>
        </div>
      </div>
    </div>
  );
}