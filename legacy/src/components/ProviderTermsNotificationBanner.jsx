import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ProviderTermsNotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [termsLastSeen, setTermsLastSeen] = useState(null);

  useEffect(() => {
    // Verifica quando o prestador viu os termos pela última vez
    const lastSeen = localStorage.getItem('provider_terms_last_seen');
    const lastUpdated = localStorage.getItem('provider_terms_updated');
    
    setTermsLastSeen(lastSeen ? new Date(lastSeen) : null);

    // Se os termos foram atualizados após a última visualização, mostra banner
    if (lastUpdated && (!lastSeen || new Date(lastUpdated) > new Date(lastSeen))) {
      setShowBanner(true);
    }
  }, []);

  const handleView = () => {
    localStorage.setItem('provider_terms_last_seen', new Date().toISOString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 rounded-2xl p-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 flex-1">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 text-sm">Termos atualizados</p>
          <p className="text-xs text-amber-700 mt-1">
            Os Termos de Serviço foram atualizados. Por favor, leia as mudanças antes de continuar.
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={handleView}
        >
          <Eye className="w-3 h-3 mr-1" /> Ver
        </Button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-amber-600 hover:text-amber-800 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}