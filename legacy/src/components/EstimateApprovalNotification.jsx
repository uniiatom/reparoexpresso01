import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle } from "lucide-react";

export default function EstimateApprovalNotification({ requestId, estimatedPrice, providerName }) {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState(null);

  const handleApproveFromNotification = async () => {
    if (approving) return;
    setApproving(true);
    setError(null);

    try {
      // Atualiza diretamente o status da solicitação
      await base44.entities.ServiceRequest.update(requestId, { status: 'aceito' });
      setApproved(true);
      console.log(`[EstimateApproval] ✅ Orçamento aprovado: ${requestId}`);
    } catch (e) {
      setError('Erro ao aprovar orçamento');
      console.error(e);
    }
    setApproving(false);
  };

  if (approved) {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-900">Orçamento aprovado!</p>
            <p className="text-xs text-green-700">Prestador será notificado em breve</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-900">Orçamento pendente</p>
          <p className="text-sm text-blue-700 mt-0.5">
            {providerName} enviou: <strong>R$ {estimatedPrice?.toFixed(2)}</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <Button
        onClick={handleApproveFromNotification}
        disabled={approving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 font-bold"
      >
        {approving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" /> Aprovar agora
          </>
        )}
      </Button>
    </div>
  );
}