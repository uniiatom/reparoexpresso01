import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Loader2, QrCode, Copy, Share2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const TIP_PRESETS = [
  { value: 10, label: 'R$ 10' },
  { value: 20, label: 'R$ 20' },
  { value: 50, label: 'R$ 50' },
  { value: 100, label: 'R$ 100' },
];

export default function TipRequestModal({ service, provider, onClose }) {
  const [selectedTip, setSelectedTip] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef(null);

  const finalAmount = customAmount ? Number(customAmount) : selectedTip;

  // Gera QR code via API pública
  const generateQrCanvas = async (url) => {
    try {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(url)}`;
      setQrDataUrl(qrImageUrl);
    } catch (err) {
      console.error('Erro ao gerar QR:', err);
      // Fallback: exibe o URL direto
      setQrDataUrl(url);
    }
  };

  const handleGenerateQr = async () => {
    if (!finalAmount || finalAmount < 5) {
      toast.error('Valor mínimo é R$ 5,00');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('createTipCheckoutSession', {
        service_id: service.id,
        provider_id: provider.id,
        amount: Math.round(finalAmount * 100), // em centavos
        client_email: service.created_by, // email do cliente que criou o serviço
        service_number: service.service_number,
      });

      if (response.data?.checkout_url) {
        const url = response.data.checkout_url;
        setCheckoutUrl(url);
        
        // Gera QR code baseado no URL
        await generateQrCanvas(url);
        setShowQr(true);
        toast.success('QR Code gerado!');
      }
    } catch (err) {
      console.error('Erro ao gerar QR:', err);
      toast.error('Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (checkoutUrl) {
      navigator.clipboard.writeText(checkoutUrl);
      toast.success('Link copiado!');
    }
  };

  const handleShareLink = () => {
    if (checkoutUrl && navigator.share) {
      navigator.share({
        title: 'Gorjeta para ' + provider.name,
        text: `Clique para enviar uma gorjeta para ${provider.name}`,
        url: checkoutUrl,
      }).catch(err => console.log('Erro ao compartilhar:', err));
    } else {
      handleCopyLink();
    }
  };

  if (showQr && qrDataUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
        <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">QR Code da Gorjeta</h3>
            <button onClick={() => setShowQr(false)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-muted rounded-2xl p-4 flex items-center justify-center">
            {qrDataUrl.startsWith('blob:') || qrDataUrl.startsWith('data:') ? (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            ) : (
              <a href={qrDataUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                Clique aqui para abrir o link de pagamento
              </a>
            )}
          </div>

          <div className="bg-primary/5 rounded-2xl p-3 border border-primary/20">
            <p className="text-sm font-semibold text-primary mb-1">R$ {finalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Escaneie o código ou clique no link abaixo</p>
          </div>

          <div className="space-y-2">
            <Button onClick={handleCopyLink} className="w-full rounded-2xl" variant="outline">
              <Copy className="w-4 h-4 mr-2" /> Copiar link
            </Button>
            <Button onClick={handleShareLink} className="w-full rounded-2xl" variant="outline">
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">A gorjeta será creditada automaticamente em sua carteira assim que o cliente confirmar o pagamento</p>
          </div>

          <Button onClick={() => setShowQr(false)} className="w-full rounded-2xl h-11 font-bold">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Solicitar Gorjeta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cliente: {service.client_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Selecione um valor:</p>
          <div className="grid grid-cols-2 gap-2">
            {TIP_PRESETS.map(tip => (
              <button
                key={tip.value}
                onClick={() => {
                  setSelectedTip(tip.value);
                  setCustomAmount('');
                }}
                className={cn(
                  "py-3 rounded-2xl border-2 font-semibold transition-all",
                  selectedTip === tip.value && !customAmount
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 text-foreground"
                )}
              >
                {tip.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <p className="text-sm font-semibold text-foreground mb-1">Ou defina um valor customizado:</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">R$</span>
              <input
                type="number"
                placeholder="0,00"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedTip(null);
                }}
                min="5"
                step="0.01"
                className="flex-1 px-3 py-2.5 rounded-2xl border-2 border-border bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
              />
            </div>
            {customAmount && <p className="text-xs text-muted-foreground mt-1">Total: R$ {Number(customAmount).toFixed(2)}</p>}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">O cliente pagará via Stripe. A gorjeta será adicionada à sua carteira em tempo real.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-2xl">
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateQr}
            disabled={!finalAmount || finalAmount < 5 || loading}
            className="flex-1 rounded-2xl bg-primary text-primary-foreground font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
            Gerar QR
          </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Script para gerar QR code via canvas
const generateQRCodeImage = async (text) => {
  try {
    // Usa a API de QR code via URL (fallback)
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(text)}`;
  } catch (err) {
    console.error('Erro ao gerar QR:', err);
    return null;
  }
};