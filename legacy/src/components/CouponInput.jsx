import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Ticket, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CouponInput({ serviceAmount, onCouponApplied, onCouponRemoved, serviceType, providerId }) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateCoupon = useMutation({
    mutationFn: (code) =>
      base44.functions.invoke('validateCoupon', {
        code,
        service_amount: serviceAmount,
        service_type: serviceType,
        provider_id: providerId,
      }),
    onSuccess: (response) => {
      const { data } = response;
      if (data.valid) {
        setAppliedCoupon(data);
        onCouponApplied(data);
        toast.success(data.message);
        setCouponCode('');
      } else {
        toast.error(data.message);
      }
      setIsLoading(false);
    },
    onError: (error) => {
      const errorMsg = error?.response?.data?.message || error.message || 'Erro ao validar cupom';
      toast.error(errorMsg);
      setIsLoading(false);
    },
  });

  const handleApply = () => {
    if (!couponCode.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }
    setIsLoading(true);
    validateCoupon.mutate(couponCode);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    onCouponRemoved();
    toast.info('Cupom removido');
  };

  return (
    <div className="space-y-2">
      {!appliedCoupon ? (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Código do cupom"
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <Ticket className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <Button
            onClick={handleApply}
            disabled={isLoading || !couponCode.trim()}
            className="rounded-xl px-4"
          >
            {isLoading ? '...' : 'Aplicar'}
          </Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">{appliedCoupon.coupon_id}</p>
              <p className="text-xs text-green-600">
                Desconto de R$ {appliedCoupon.discount_amount.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveCoupon}
            className="p-1 hover:bg-green-100 rounded-lg transition-colors"
            title="Remover cupom"
          >
            <X className="w-4 h-4 text-green-700" />
          </button>
        </div>
      )}
    </div>
  );
}