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
    { value: 'instalacao', label: 'Instalação', emoji: '⚙️', desc: 'Instalar novo pressurizador' },
    { value: 'reparo', label: 'Reparo/Manutenção', emoji: '🔩', desc: 'Consertar existente' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-4 pb-6 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground mb-0.5 text-center">Pressurizador</h3>
        <p className="text-xs text-muted-foreground text-center mb-4">Qual tipo de serviço?</p>
        
        <div className="grid grid-cols-1 gap-2">
          {TIPOS.map(tipo => (
            <button
              key={tipo.value}
              onClick={() => {
                onSelect(tipo.value);
                onClose();
              }}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all active:scale-95 text-left"
            >
              <span className="text-2xl flex-shrink-0">{tipo.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-xs">{tipo.label}</p>
                <p className="text-[10px] text-muted-foreground">{tipo.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}