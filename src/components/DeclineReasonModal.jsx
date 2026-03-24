import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, XCircle } from "lucide-react";

const REASONS = [
  "Fora da minha área de atuação",
  "Não tenho disponibilidade no momento",
  "Distância muito grande",
  "Tipo de serviço não atendo",
  "Já estou com outro chamado",
];

export default function DeclineReasonModal({ onConfirm, onCancel }) {
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');

  const reason = selected === 'outro' ? custom.trim() : selected;

  const handleConfirm = () => {
    onConfirm(reason || null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <h2 className="font-bold text-foreground">Motivo da recusa</h2>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2 overflow-y-auto flex-1">
          <p className="text-sm text-muted-foreground mb-3">Selecione o motivo (opcional)</p>
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm transition-all ${
                selected === r
                  ? 'border-destructive bg-destructive/5 text-destructive font-semibold'
                  : 'border-border hover:border-destructive/40 text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setSelected('outro')}
            className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm transition-all ${
              selected === 'outro'
                ? 'border-destructive bg-destructive/5 text-destructive font-semibold'
                : 'border-border hover:border-destructive/40 text-foreground'
            }`}
          >
            Outro motivo...
          </button>

          {selected === 'outro' && (
            <Textarea
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Descreva o motivo..."
              className="rounded-2xl mt-2"
            />
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={onCancel}>
            Voltar
          </Button>
          <Button
            className="flex-1 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold"
            onClick={handleConfirm}
          >
            Confirmar recusa
          </Button>
        </div>
      </div>
    </div>
  );
}