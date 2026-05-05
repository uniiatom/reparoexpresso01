import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, CheckCircle2, DollarSign, Ticket, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PaymentModal({ isOpen, onClose, serviceData }) {
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe' or 'pix'
  const [error, setError] = useState(null);
  const [referenceCode, setReferenceCode] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState(null);

  if (!serviceData) return null;

  // Parse price from string like "R$ 80 - R$ 150"
  const priceText = serviceData.price || '0';
  const priceMatch = priceText.match(/R\$\s([\d.,]+)/);
  const baseAmount = priceMatch ? parseFloat(priceMatch[1].replace('.', '').replace(',', '.')) : 0;
  
  // Calculate discount if coupon is applied
  let finalAmount = baseAmount;
  let discountAmount = 0;
  
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = baseAmount * (appliedCoupon.discount_value / 100);
      if (appliedCoupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, appliedCoupon.max_discount_amount);
      }
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
    finalAmount = Math.max(0, baseAmount - discountAmount);
  }

  const validateAndApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setValidatingCoupon(true);
    setCouponError(null);

    try {
      const response = await base44.functions.invoke('validateCoupon', {
        couponCode: couponCode.toUpperCase(),
        amount: baseAmount,
      });

      if (response.data.valid) {
        setAppliedCoupon(response.data.coupon);
        setCouponCode('');
        toast.success('Cupom aplicado com sucesso!');
      } else {
        setCouponError(response.data.message || 'Cupom inválido');
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
      setCouponError(err.response?.data?.message || 'Erro ao validar cupom');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

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

      // Generate reference code
      const code = `MES-${Date.now().toString().slice(-8).toUpperCase()}`;
      setReferenceCode(code);

      const response = await base44.functions.invoke('createCheckoutSession', {
        amount: finalAmount,
        serviceName: `${serviceData.type} - ${serviceData.subtipo}`,
        serviceData: serviceData,
        referenceCode: code,
        couponId: appliedCoupon?.id,
        discountAmount: discountAmount,
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

  const handlePixPayment = () => {
    setPaymentMethod('pix');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-4 h-4 text-primary" />
            Pagamento
          </DialogTitle>
          <DialogDescription className="text-xs">
            Finalize o pagamento do seu serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Reference Code */}
          {referenceCode && (
            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
              <p className="text-xs text-green-700 font-semibold mb-0.5">Código de Referência</p>
              <p className="text-sm font-bold text-green-900 font-mono">{referenceCode}</p>
            </div>
          )}

          {/* Coupon Input */}
          {!appliedCoupon && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Cupom
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Código"
                  disabled={validatingCoupon}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  onClick={validateAndApplyCoupon}
                  disabled={!couponCode.trim() || validatingCoupon}
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-auto px-2"
                >
                  {validatingCoupon ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'OK'
                  )}
                </Button>
              </div>
              {couponError && (
                <p className="text-xs text-destructive">{couponError}</p>
              )}
            </div>
          )}

          {/* Applied Coupon Badge */}
          {appliedCoupon && (
            <div className="bg-green-50 rounded-lg p-2 border border-green-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-green-900">{appliedCoupon.code}</p>
                  <p className="text-xs text-green-700">
                    {appliedCoupon.discount_type === 'percentage'
                      ? `${appliedCoupon.discount_value}% OFF`
                      : `R$ ${appliedCoupon.discount_value.toFixed(2)}`}
                  </p>
                </div>
              </div>
              <Button
                onClick={removeCoupon}
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-green-700 hover:text-green-900 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Amount */}
          <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/20">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <p className="text-muted-foreground">Original</p>
                <p className="font-semibold text-foreground">R$ {baseAmount.toFixed(2)}</p>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-green-600">
                  <p>Desconto</p>
                  <p className="font-semibold">-R$ {discountAmount.toFixed(2)}</p>
                </div>
              )}
              <div className="border-t border-primary/20 pt-1 flex justify-between items-center">
                <p className="text-xs font-bold text-primary">Total</p>
                <p className="text-lg font-bold text-primary">R$ {finalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Service Name */}
          <div className="text-xs text-muted-foreground text-center py-1">
            Serviço: <span className="font-semibold text-foreground">{serviceData.type}</span>
          </div>

          {/* Payment Method Selection */}
          {paymentMethod === 'stripe' && (
            <>
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {/* Info */}
              {paymentStatus !== 'redirecting' && (
                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-1 h-1 bg-blue-600 rounded-full mt-1 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Redirecionamento seguro para Stripe
                  </p>
                </div>
              )}

              {/* Success Message */}
              {paymentStatus === 'redirecting' && (
                <div className="flex items-center justify-center gap-2 text-primary py-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs font-semibold">Redirecionando...</span>
                </div>
              )}
            </>
          )}

          {/* Method Buttons */}
          {paymentMethod === 'stripe' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                onClick={handlePayment}
                disabled={isPaying || paymentStatus === 'redirecting'}
                className="rounded-lg h-9 font-semibold bg-primary text-primary-foreground text-sm"
              >
                {isPaying ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <DollarSign className="w-3 h-3 mr-1" />
                    Cartão
                  </>
                )}
              </Button>
              <Button
                onClick={handlePixPayment}
                disabled={isPaying || paymentStatus === 'redirecting'}
                variant="outline"
                className="rounded-lg h-9 font-semibold text-sm"
              >
                PIX
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1 pt-2 border-t border-border">
           {paymentMethod === 'stripe' && (
             <>
               <Button
                 onClick={onClose}
                 disabled={isPaying || paymentStatus === 'redirecting'}
                 variant="outline"
                 className="w-full rounded-lg h-9 text-sm"
               >
                 Cancelar
               </Button>
             </>
           )}
         </div>
      </DialogContent>
    </Dialog>
  );
}