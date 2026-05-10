import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExtraChargesApprovalPanel({ service, onApprovalChange }) {
  const [loading, setLoading] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [localService, setLocalService] = useState(service);

  // Atualiza em tempo real quando o service muda
  useEffect(() => {
    setLocalService(service);
  }, [service]);

  if (!localService?.extra_charges || localService.extra_charges.status !== 'pending_approval') {
    return null;
  }

  const { items = [], total = 0, notes = '', new_total = 0 } = localService.extra_charges;
  const originalPrice = localService.final_price || localService.estimated_price || 0;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('approveExtraCharges', {
        service_id: localService.id,
        provider_id: localService.provider_id,
        provider_name: localService.provider_name,
        client_name: localService.client_name,
        original_price: originalPrice,
        extra_charges_total: total,
        new_total: new_total,
      });

      toast.success('Orçamento aprovado! O prestador foi notificado.');
      onApprovalChange?.();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionNotes.trim()) {
      toast.error('Informe um motivo para a rejeição');
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke('rejectExtraCharges', {
        service_id: localService.id,
        provider_id: localService.provider_id,
        provider_name: localService.provider_name,
        client_name: localService.client_name,
        rejection_notes: rejectionNotes,
      });

      toast.success('Orçamento rejeitado. O prestador foi notificado.');
      onApprovalChange?.();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar orçamento');
    } finally {
      setLoading(false);
      setShowRejectionForm(false);
      setRejectionNotes('');
    }
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 space-y-4 mb-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-900">Orçamento extra aguardando aprovação</p>
          <p className="text-sm text-amber-800 mt-1">O prestador solicitou um adicional de R$ {total.toFixed(2)} para completar o serviço.</p>
        </div>
      </div>

      {/* Itens do orçamento extra */}
      <div className="space-y-2 bg-white rounded-2xl p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Itens solicitados:</p>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} {item.quantity === 1 ? 'un' : 'uns'} × R$ {item.price.toFixed(2)}
              </p>
            </div>
            <p className="text-sm font-bold text-foreground">R$ {(item.quantity * item.price).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-sm text-blue-800">
          <p className="font-semibold mb-1">Observações do prestador:</p>
          <p>{notes}</p>
        </div>
      )}

      {/* Resumo de valores */}
      <div className="bg-white rounded-2xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Valor original:</span>
          <span className="font-semibold text-foreground">R$ {originalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-border pt-2">
          <span className="text-muted-foreground">+ Itens extras:</span>
          <span className="font-semibold text-amber-700">R$ {total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t border-amber-300 pt-2">
          <span className="text-foreground">Novo total:</span>
          <span className="text-amber-700">R$ {new_total.toFixed(2)}</span>
        </div>
      </div>

      {/* Formulário de rejeição */}
      {showRejectionForm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">Por que está rejeitando?</p>
          <textarea
            placeholder="Explique o motivo da rejeição..."
            value={rejectionNotes}
            onChange={(e) => setRejectionNotes(e.target.value)}
            className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowRejectionForm(false);
                setRejectionNotes('');
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={loading || !rejectionNotes.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Confirmar Rejeição
            </Button>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      {!showRejectionForm && (
        <div className="flex gap-2">
          <Button
            onClick={() => setShowRejectionForm(true)}
            variant="outline"
            className="flex-1 rounded-2xl border-red-300 text-red-600 hover:bg-red-50 h-11 font-semibold"
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-2" /> Rejeitar
          </Button>
          <Button
            onClick={handleApprove}
            className="flex-1 rounded-2xl bg-green-600 hover:bg-green-700 text-white h-11 font-semibold"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Aprovar Orçamento
          </Button>
        </div>
      )}
    </div>
  );
}