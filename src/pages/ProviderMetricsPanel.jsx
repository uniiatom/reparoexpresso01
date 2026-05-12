import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ProviderPerformanceMetrics from '../components/provider/ProviderPerformanceMetrics';

export default function ProviderMetricsPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser) {
        // Tenta primeiro por user_id, depois por email
        let providers = await base44.entities.Provider.filter({ user_id: currentUser.id });
        if (!providers[0] && currentUser.email) {
          providers = await base44.entities.Provider.filter({ email: currentUser.email });
        }
        if (providers[0]) {
          setProvider(providers[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Perfil não encontrado</h1>
          <p className="text-muted-foreground">Não conseguimos encontrar seu perfil de prestador.</p>
          <Button onClick={() => navigate('/prestador')} className="rounded-xl">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/prestador')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel de Desempenho</h1>
            <p className="text-muted-foreground">Acompanhe seu crescimento na plataforma</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 hover:bg-muted rounded-xl transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Informações do Prestador */}
      <div className="bg-card rounded-2xl p-6 border border-border mb-8">
        <div className="flex items-center gap-4">
          {provider.photo_url && (
            <img
              src={provider.photo_url}
              alt={provider.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{provider.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {provider.rating && (
                <span>⭐ {provider.rating.toFixed(1)} ({provider.total_reviews} avaliações)</span>
              )}
              <span>📊 {provider.total_jobs} serviços realizados</span>
              {provider.city && <span>📍 {provider.city}, {provider.state}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de Desempenho */}
      <ProviderPerformanceMetrics providerId={provider.id} />

      {/* Dicas de Crescimento */}
      <div className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
        <h3 className="text-lg font-bold text-foreground mb-3">💡 Dicas para Crescer na Plataforma</h3>
        <ul className="space-y-2 text-sm text-foreground">
          <li>✓ Responda rapidamente às solicitações de serviço</li>
          <li>✓ Mantenha uma taxa de conclusão acima de 90%</li>
          <li>✓ Peça avaliações dos clientes após cada serviço</li>
          <li>✓ Atualize seu perfil e portfólio regularmente</li>
          <li>✓ Ofereça serviços adicionais para aumentar sua receita</li>
        </ul>
      </div>
    </div>
  );
}