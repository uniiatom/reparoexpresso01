import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PressurizadorFeasibilityTracker({ clientId, onOpenPressurizadorFlow }) {
  const [techVisitRequest, setTechVisitRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeasibilityStatus, setShowFeasibilityStatus] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const fetchTechVisit = async () => {
      try {
        const requests = await base44.entities.ServiceRequest.filter({
          client_id: clientId,
          service_type: 'pressurizador',
          tech_visit_reason: { $exists: true }
        });

        // Pega a visita técnica mais recente
        const recent = requests.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        )[0];

        setTechVisitRequest(recent || null);
      } catch (e) {
        console.error('Erro ao buscar visita técnica:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTechVisit();

    // Recarrega a cada 5s para checar atualizações de status
    const interval = setInterval(fetchTechVisit, 5000);
    return () => clearInterval(interval);
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  // Não há visita técnica pendente/concluída
  if (!techVisitRequest) {
    return null;
  }

  const isCompleted = ['concluido', 'aceito'].includes(techVisitRequest.status);
  const isFeasible = techVisitRequest.tech_visit_reason?.includes('viável') || 
                     techVisitRequest.tech_visit_reason?.includes('Viável');

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">
            {isCompleted ? 'Visita Técnica Concluída' : 'Visita Técnica em Andamento'}
          </p>
          {isCompleted && (
            <p className="text-xs text-muted-foreground mt-1">
              {isFeasible 
                ? '✓ Instalação é viável no seu local'
                : '⚠️ Instalação não é viável conforme avaliação do técnico'}
            </p>
          )}
          {techVisitRequest.tech_visit_reason && (
            <p className="text-xs text-muted-foreground mt-1">
              {techVisitRequest.tech_visit_reason}
            </p>
          )}
        </div>
      </div>

      {/* Botão para solicitar instalação (apenas se viável) */}
      {isCompleted && isFeasible && (
        <Button
          onClick={() => onOpenPressurizadorFlow('instalacao')}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Solicitar Instalação
        </Button>
      )}
    </div>
  );
}