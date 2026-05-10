import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function OutrosServicoModal({ onClose, onConfirm }) {
  const [descricao, setDescricao] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Outros serviços</h3>
            <p className="text-xs text-muted-foreground">Descreva o que você está precisando</p>
          </div>
        </div>

        <Textarea
          placeholder="Ex: Preciso instalar um portão manual, fazer uma reforma na cozinha, pintar uma parede..."
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          className="min-h-[120px] rounded-2xl mb-4"
          autoFocus
        />

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">ℹ️ Como funciona:</span> Suas informações serão analisadas pela nossa equipe responsável e daremos retorno o mais breve possível para viabilizar o seu atendimento.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(descricao)}
            disabled={descricao.trim().length < 10}
            className="flex-1 rounded-2xl"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}