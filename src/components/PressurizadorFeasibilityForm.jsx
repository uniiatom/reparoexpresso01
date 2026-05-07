import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PressurizadorFeasibilityForm({ requestId, onSubmitted }) {
  const [isFeasible, setIsFeasible] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isFeasible === null) {
      toast.error('Selecione se é viável ou não');
      return;
    }

    setSubmitting(true);
    try {
      const result = await base44.functions.invoke('recordTechVisitResult', {
        requestId,
        isFeasible,
        reason: reason.trim()
      });

      if (result.data.success) {
        toast.success('Viabilidade registrada com sucesso!');
        if (onSubmitted) onSubmitted(isFeasible);
      }
    } catch (error) {
      toast.error('Erro ao registrar viabilidade: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-4">
      <div>
        <h3 className="font-bold text-foreground mb-2">Resultado da Visita Técnica</h3>
        <p className="text-xs text-muted-foreground mb-3">É viável instalar pressurizador neste local?</p>

        <div className="flex gap-3 mb-3">
          {[
            { value: true, label: 'Viável', emoji: '✓', color: 'bg-green-50 border-green-300' },
            { value: false, label: 'Não Viável', emoji: '✗', color: 'bg-red-50 border-red-300' }
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setIsFeasible(opt.value)}
              className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${
                isFeasible === opt.value ? opt.color : 'border-border'
              }`}
            >
              <span className="text-2xl block mb-1">{opt.emoji}</span>
              <span className="text-sm font-semibold text-foreground">{opt.label}</span>
            </button>
          ))}
        </div>

        {isFeasible !== null && (
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Motivo / Observação
            </label>
            <textarea
              placeholder={isFeasible ? 
                'Ex: Pressão da água adequada, espaço para instalação...' :
                'Ex: Pressão baixa demais, sem espaço útil...'
              }
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full rounded-lg border border-border p-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isFeasible === null || submitting}
        className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Resultado'}
      </Button>
    </div>
  );
}