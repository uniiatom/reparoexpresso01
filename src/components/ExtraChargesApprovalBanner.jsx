import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ExtraChargesApprovalBanner({ serviceId, onApproval, onDenial }) {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const loadService = async () => {
      try {
        const s = await base44.entities.ServiceRequest.get(serviceId);
        setService(s);
      } catch (error) {
        console.error('Erro ao carregar serviço:', error);
      }
    };

    loadService();

    // Subscribe para atualizações em tempo real
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.id === serviceId && event.type === 'update') {
        setService(event.data);
      }
    });

    return unsub;
  }, [serviceId]);

  if (!service?.extra_charges) return null;

  const charges = service.extra_charges;
  if (charges.status !== 'pending_approval') return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Atualiza status no serviço
      await base44.entities.ServiceRequest.update(serviceId, {
        extra_charges: {
          ...charges,
          status: 'approved',
          approved_at: new Date().toISOString(),
        },
        final_price: charges.new_total,
      });

      // Regenera checkout com novo valor
      await base44.functions.invoke('updateCheckoutWithExtraCharges', {
        service_id: serviceId,
        new_total: charges.new_total,
        extra_charges: charges.items,
      });

      toast.success('Orçamento extra aprovado!');
      onApproval?.();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao aprovar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    try {
      await base44.entities.ServiceRequest.update(serviceId, {
        extra_charges: {
          ...charges,
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        }
      });

      // Notifica prestador da rejeição
      await base44.functions.invoke('notifyExtraChargesRejected', {
        service_id: serviceId,
        provider_id: service.provider_id,
      });

      toast.info('Orçamento extra rejeitado');
      onDenial?.();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao rejeitar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const originalPrice = service.estimated_price || 0;
  const extraTotal = charges.total;

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl overflow-hidden">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-yellow-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-yellow-900 text-sm">Orçamento Extra Pendente</p>
            <p className="text-xs text-yellow-700">
              + R$ {extraTotal.toFixed(2)} | Novo total: R$ {charges.new_total.toFixed(2)}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="bg-white p-4 border-t border-yellow-300 space-y-4">
          {/* Itens */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase">Itens adicionados:</p>
            {charges.items.map((item, idx) => (
              <div key={idx} className="bg-yellow-50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{item.description}</p>
                  <p className="text-yellow-700 font-bold">R$ {(item.quantity * item.price).toFixed(2)}</p>
                </div>
                <p className="text-muted-foreground">
                  {item.quantity} {item.unit} × R$ {item.price.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Observações */}
          {charges.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-1">Observações do prestador:</p>
              <p className="text-xs text-blue-700">{charges.notes}</p>
            </div>
          )}

          {/* Valores */}
          <div className="space-y-2 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Orçamento original:</span>
              <span className="font-semibold text-foreground">R$ {originalPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Itens extras:</span>
              <span className="font-semibold text-yellow-700">+ R$ {extraTotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
              <span className="font-bold text-foreground">Novo total:</span>
              <span className="text-lg font-bold text-primary">R$ {charges.new_total.toFixed(2)}</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button
              onClick={handleDeny}
              disabled={loading}
              variant="outline"
              className="flex-1 rounded-xl border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              <X className="w-4 h-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Aprovar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Ao aprovar, o valor será atualizado automaticamente no pagamento
          </p>
        </div>
      )}
    </div>
  );
}