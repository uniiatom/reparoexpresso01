import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

// Props: isOpen, onClose, requestId, finalPrice, serviceName, appliedCoupon (opcional)
export default function PaymentModal({ isOpen, onClose, requestId, finalPrice, serviceName, appliedCoupon }) {
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const baseAmount = appliedCoupon ? appliedCoupon.original_amount ?? finalPrice : finalPrice;
  const discountAmount = appliedCoupon?.discount_amount ?? 0;
  const totalAmount = appliedCoupon ? appliedCoupon.final_amount : finalPrice;

  const handlePay = async () => {
    setIsPaying(true);
    setError(null);

    // Bloqueia checkout dentro de iframe
    if (window.self !== window.top) {
      alert('O checkout funciona apenas no app publicado. Abra o app em uma nova aba para pagar.');
      setIsPaying(false);
      return;
    }

    try {
      const response = await base44.functions.invoke('createCheckoutSession', {
        serviceRequestId: requestId,
        amount: totalAmount,
        serviceName: serviceName || 'Serviço',
        couponId: appliedCoupon?.id || null,
        couponCode: appliedCoupon?.code || null,
        discountAmount: discountAmount,
        originalPrice: baseAmount,
      });

      if (response.data?.sessionUrl) {
        window.location.href = response.data.sessionUrl;
      } else {
        setError('Erro ao iniciar pagamento. Tente novamente.');
        setIsPaying(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar pagamento.');
      setIsPaying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Pagamento via Cartão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Resumo do valor */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700 font-medium">
                  <span>Desconto ({appliedCoupon?.code})</span>
                  <span>- R$ {discountAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-2" />
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="font-bold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">{serviceName}</p>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <span className="text-blue-600 text-sm">🔒</span>
            <p className="text-xs text-blue-700">
              Pagamento seguro processado pelo Stripe. Você será redirecionado para a página de pagamento.
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Botões */}
          <Button
            onClick={handlePay}
            disabled={isPaying}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
          >
            {isPaying ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Aguarde...</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" /> Pagar R$ {totalAmount.toFixed(2)}</>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPaying}
            className="w-full rounded-2xl"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}