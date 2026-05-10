import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { X, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TipRequestModal({ request, provider, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const presetAmounts = [10, 20, 30, 50];

  const handleRequestTip = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setLoading(true);
    try {
      // Verifica se está rodando em iframe
      if (window.self !== window.top) {
        toast.error('Pagamento só funciona em app publicado');
        setLoading(false);
        return;
      }

      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Cria sessão de checkout para pagamento da gorjeta
      const result = await base44.functions.invoke('createTipCheckoutSession', {
        service_id: request.id,
        provider_id: request.provider_id,
        amount: amountInCents,
        client_email: request.created_by,
        service_number: request.service_number,
      });

      console.log('[TipRequestModal] Resultado:', result.data);

      if (!result.data?.checkout_url) {
        throw new Error('Falha ao gerar link de pagamento: ' + JSON.stringify(result.data));
      }

      // Abre o checkout do Stripe
      window.location.href = result.data.checkout_url;
    } catch (error) {
      console.error('Erro ao solicitar gorjeta:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <h2 className="text-lg font-bold text-foreground">Gratificar o Prestador</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-amber-900 mb-1">Ficou satisfeito com o serviço?</p>
            <p className="text-xs text-amber-800">
              Deixe uma gorjeta para <strong>{provider?.name}</strong> e reconheça o bom trabalho! 💪
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Selecione um valor:</p>
          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`py-2 px-3 rounded-xl font-bold text-sm transition-all ${
                  amount === amt.toString()
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                    : 'bg-muted text-foreground hover:bg-accent'
                }`}
              >
                R$ {amt}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Ou informe um valor:</label>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-bold">R$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
          <p className="text-xs text-green-800">
            ✓ A gorjeta é opcional e completamente segura. Você pode pagar por PIX, cartão ou outro método.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-2xl">
            Cancelar
          </Button>
          <Button
            onClick={handleRequestTip}
            disabled={loading || !amount}
            className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-600 hover:to-orange-600"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Gift className="w-4 h-4 mr-2" />
            )}
            Confirmar Gorjeta
          </Button>
        </div>
      </div>
    </div>
  );
}