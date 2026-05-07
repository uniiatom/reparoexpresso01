import React, { useState } from 'react';

export default function PressurizadorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentType 
}) {
  const TIPOS = [
    { value: 'visita_tecnica', label: 'Visita Técnica', emoji: '🔧', desc: 'Avaliar a instalação' },
    { value: 'instalacao', label: 'Instalação', emoji: '⚙️', desc: 'Instalar novo pressurizador' },
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
          {TIPOS.map(tipo => (
            <button
              key={tipo.value}
              onClick={() => {
                onSelect(tipo.value);
                onClose();
              }}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95 text-left"
            >
              <span className="text-3xl">{tipo.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm">{tipo.label}</p>
                <p className="text-xs text-muted-foreground">{tipo.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}