import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { X, Gift, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function TipRequestModal({ request, provider, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentProviders, setRecentProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(provider);
  const [showProviderList, setShowProviderList] = useState(false);

  const presetAmounts = [10, 20, 30, 50];

  useEffect(() => {
    const loadRecentProviders = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.email) {
          const requests = await base44.entities.ServiceRequest.filter(
            { created_by: user.email },
            '-created_date',
            30
          );
          // Pega últimos 10 prestadores únicos com foto
          const uniqueProviders = [];
          const seen = new Set();
          for (const req of requests) {
            if (req.provider_id && !seen.has(req.provider_id)) {
              const provs = await base44.entities.Provider.filter({ id: req.provider_id });
              if (provs[0]) {
                uniqueProviders.push(provs[0]);
                seen.add(req.provider_id);
                if (uniqueProviders.length >= 10) break;
              }
            }
          }
          setRecentProviders(uniqueProviders);
        }
      } catch (err) {
        console.error('Erro ao carregar prestadores:', err);
      }
    };
    loadRecentProviders();
  }, []);

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
        provider_id: selectedProvider.id,
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

  if (showProviderList) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
        <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowProviderList(false)}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold text-foreground">Selecione o prestador</h2>
            <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          {recentProviders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum prestador anterior encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto">
              {recentProviders.map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => {
                    setSelectedProvider({ name: prov.name, id: prov.id });
                    setShowProviderList(false);
                  }}
                  className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  {prov.photo_url ? (
                    <img
                      src={prov.photo_url}
                      alt={prov.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {prov.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs text-foreground font-semibold text-center line-clamp-2">
                    {prov.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
      <div className="bg-card w-full max-w-xs rounded-3xl shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-foreground">🎁 Gratificação</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-3 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-amber-900">Gratifique o prestador</p>
            <p className="text-xs text-amber-800 mt-1">
              Clique na foto para selecionar
            </p>
          </div>

          {/* Grid de fotos dos últimos prestadores */}
          {recentProviders.length > 0 && (
            <div>
              <div className="grid grid-cols-5 gap-2">
                {recentProviders.map((prov) => (
                  <button
                    key={prov.id}
                    onClick={() => setSelectedProvider({ name: prov.name, id: prov.id })}
                    className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all ${
                      selectedProvider?.id === prov.id
                        ? 'ring-2 ring-amber-500 scale-105'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {prov.photo_url ? (
                      <img
                        src={prov.photo_url}
                        alt={prov.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-900">
                        {prov.name.charAt(0)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selectedProvider?.id && (
                <div className="text-center mt-2">
                  <p className="text-xs text-amber-700 font-semibold">
                    ✓ {selectedProvider.name}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Valor:</p>
          <div className="grid grid-cols-4 gap-1.5">
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all ${
                  amount === amt.toString()
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-accent'
                }`}
              >
                R$ {amt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-bold text-sm">R$</span>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl text-xs h-9">
            Cancelar
          </Button>
          <Button
            onClick={handleRequestTip}
            disabled={loading || !amount}
            className="flex-1 rounded-xl text-xs h-9 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-600 hover:to-orange-600"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Gift className="w-3 h-3 mr-1" />
            )}
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}