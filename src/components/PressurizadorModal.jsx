import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function PressurizadorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentType,
  hasCompletedTechVisit = false
}) {
  const TIPOS = [
    { value: 'visita_tecnica', label: 'Visita Técnica', emoji: '🔧', desc: 'Avaliar a instalação' },
    { value: 'instalacao', label: 'Instalação', emoji: '⚙️', desc: 'Instalar novo pressurizador', requiresTechVisit: true },
    { value: 'reparo', label: 'Reparo/Manutenção', emoji: '🔩', desc: 'Consertar existente' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <h3 className="text-lg font-bold text-foreground mb-1 text-center">Pressurizador</h3>
        <p className="text-sm text-muted-foreground text-center mb-5">Qual tipo de serviço você precisa?</p>
        
        <div className="grid grid-cols-1 gap-3">
          {TIPOS.map(tipo => {
            const isDisabled = tipo.requiresTechVisit && !hasCompletedTechVisit;
            
            return (
              <button
                key={tipo.value}
                onClick={() => {
                  if (!isDisabled) {
                    onSelect(tipo.value);
                    onClose();
                  }
                }}
                disabled={isDisabled}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-95 text-left ${
                  isDisabled
                    ? 'border-border/50 opacity-50 cursor-not-allowed bg-muted/30'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-3xl">{tipo.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">{tipo.label}</p>
                  <p className="text-xs text-muted-foreground">{tipo.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Alerta sobre requisito de visita técnica */}
        {!hasCompletedTechVisit && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-3 flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <strong>Primeira vez?</strong> Comece com uma visita técnica para avaliar se é viável a instalação no seu local.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}