import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Calendar } from "lucide-react";

export default function ServiceCompletionModal({ open, onClose, onComplete }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Como finalizar este atendimento?</DialogTitle>
          <DialogDescription>
            Escolha a opção que melhor descreve o resultado do serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <button
            onClick={() => {
              onComplete('concluido');
              onClose();
            }}
            className="w-full p-3 rounded-xl border-2 border-green-200 hover:bg-green-50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-700">Finalizar com Sucesso</p>
                <p className="text-xs text-green-600">Serviço concluído normalmente</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onComplete('em_espera');
              onClose();
            }}
            className="w-full p-3 rounded-xl border-2 border-blue-200 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-700">Solicitado Peça</p>
                <p className="text-xs text-blue-600">Cliente precisa adquirir peça/material</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onComplete('visita_tecnica');
              onClose();
            }}
            className="w-full p-3 rounded-xl border-2 border-orange-200 hover:bg-orange-50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-700">Visita Técnica</p>
                <p className="text-xs text-orange-600">Agendamento necessário para continuação</p>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}