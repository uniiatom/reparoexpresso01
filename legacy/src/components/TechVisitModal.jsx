import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Wrench } from "lucide-react";

export default function TechVisitModal({ open, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Visita Técnica Necessária</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Descrição */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <p className="text-sm text-blue-800">
            Informe o motivo pelo qual o serviço requer uma visita técnica adicional. Isso será utilizado para agendar o retorno com o cliente.
          </p>
        </div>

        {/* Campo de entrada */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">O que precisa ser feito na visita técnica?</label>
          <Textarea
            placeholder="Descreva os problemas encontrados e o que será necessário fazer no retorno (ex: Peça está com defeito, será substituída na próxima visita)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px] rounded-2xl"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            onClick={handleSubmit}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? '...' : 'Confirmar Visita'}
          </Button>
        </div>
      </div>
    </div>
  );
}