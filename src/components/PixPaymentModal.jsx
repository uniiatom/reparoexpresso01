import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, CheckCircle2, Copy, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PixPaymentModal({ isOpen, onClose, requestId, finalPrice, serviceName, onPaymentConfirmed }) {
  const [pixData, setPixData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const generatePixQrCode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await base44.functions.invoke('generatePixQrCode', {
        requestId,
        amount: finalPrice,
      });

      if (response.data.success) {
        setPixData(response.data);
      } else {
        setError('Erro ao gerar QR Code PIX');
      }
    } catch (err) {
      console.error('PIX generation error:', err);
      setError(err.response?.data?.error || 'Erro ao gerar PIX');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixKey = () => {
    if (pixData?.pixKey) {
      navigator.clipboard.writeText(pixData.pixKey);
      setCopied(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const checkPaymentStatus = async () => {
    setCheckingPayment(true);
    try {
      const list = await base44.entities.ServiceRequest.filter({ id: requestId });
      const request = list[0];
      
      if (request?.payment_status === 'paid') {
        toast.success('✓ Pagamento confirmado!');
        onPaymentConfirmed?.();
        onClose();
      } else {
        toast.info('Pagamento não confirmado ainda. Tente novamente em alguns segundos.');
      }
    } catch (err) {
      console.error('Error checking payment:', err);
      toast.error('Erro ao verificar pagamento');
    } finally {
      setCheckingPayment(false);
    }
  };

  useEffect(() => {
    if (isOpen && !pixData) {
      generatePixQrCode();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Pagar com PIX
          </DialogTitle>
          <DialogDescription>
            Escaneie o código ou copie a chave PIX
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

          {/* QR Code Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          {/* QR Code Display */}
          {pixData && !isLoading && (
            <>
              <div className="bg-white rounded-2xl p-4 border border-border flex items-center justify-center min-h-[250px]">
                <div className="text-center">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <div className="text-center">
                      <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">QR Code PIX</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Escaneie com seu banco</p>
                </div>
              </div>

              {/* PIX Key Copy */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">Chave PIX (Copia e Cola)</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted rounded-xl p-3 font-mono text-xs break-all">
                    {pixData.pixKey}
                  </div>
                  <Button
                    onClick={copyPixKey}
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    className={cn(
                      "rounded-xl flex-shrink-0",
                      copied && "bg-green-600 hover:bg-green-600"
                    )}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Pagamento expira em 15 minutos. Após realizar a transferência PIX, clique em "Confirmar Pagamento".
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <Button
            onClick={checkPaymentStatus}
            disabled={!pixData || checkingPayment || isLoading}
            className="w-full rounded-2xl h-11 font-semibold bg-primary text-primary-foreground"
          >
            {checkingPayment ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading || checkingPayment}
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