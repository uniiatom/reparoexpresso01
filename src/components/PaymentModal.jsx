import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PaymentModal({ isOpen, onClose, requestId, finalPrice, serviceName }) {
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    setIsPaying(true);
    setError(null);
    
    try {
      // Check if running in iframe
      if (window.self !== window.top) {
        alert('O checkout funciona apenas quando o app é publicado. Abra o app em uma nova aba para realizar o pagamento.');
        setIsPaying(false);
        return;
      }

      const response = await base44.functions.invoke('createCheckoutSession', {
        serviceRequestId: requestId,
        amount: finalPrice,
        serviceName: serviceName,
      });

      if (response.data.sessionUrl) {
        setPaymentStatus('redirecting');
        window.location.href = response.data.sessionUrl;
      } else {
        setError('Erro ao iniciar pagamento');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || 'Erro ao processar pagamento');
      setIsPaying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Finalizar Pagamento
          </DialogTitle>
          <DialogDescription>
            Pague o valor final do serviço com segurança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 text-center">
            <p className="text-xs text-muted-foreground mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-primary">R$ {finalPrice.toFixed(2)}</p>
          </div>

          {/* Service Name */}
          {serviceName && (
            <div className="text-sm text-muted-foreground text-center">
              Serviço: <span className="font-semibold text-foreground">{serviceName}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Info */}
          {paymentStatus !== 'redirecting' && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Você será redirecionado para a página segura de pagamento da Stripe
              </p>
            </div>
          )}

          {/* Success Message */}
          {paymentStatus === 'redirecting' && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-semibold">Redirecionando...</span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <Button
            onClick={handlePayment}
            disabled={isPaying || paymentStatus === 'redirecting'}
            className="w-full rounded-2xl h-11 font-semibold bg-primary text-primary-foreground"
          >
            {isPaying || paymentStatus === 'redirecting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Pagar R$ {finalPrice.toFixed(2)}
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            disabled={isPaying || paymentStatus === 'redirecting'}
            variant="outline"
            className="w-full rounded-2xl"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}