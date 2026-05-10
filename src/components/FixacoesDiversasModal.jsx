import React from 'react';

const OPCOES = [
  { value: 'Quadro / Espelho', emoji: '🖼️', desc: 'Paredes de alvenaria ou drywall' },
  { value: 'Cortina', emoji: '🪟', desc: 'Trilho, varão ou suporte' },
  { value: 'Persiana', emoji: '🏮', desc: 'Rolo, veneziana ou romana' },
  { value: 'Varal de teto', emoji: '👕', desc: 'Varal suspenso no teto' },
  { value: 'Prateleira', emoji: '📚', desc: 'Prateleiras e nichos' },
  { value: 'Luminária / Lustre', emoji: '💡', desc: 'Pendente, plafon ou arandela' },
  { value: 'Suporte de parede', emoji: '🔩', desc: 'Suporte geral na parede' },
  { value: 'Outros itens', emoji: '🛠️', desc: 'Outros itens de fixação' },
];

export default function FixacoesDiversasModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-4 pb-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground mb-0.5 text-center">Fixações Diversas</h3>
        <p className="text-xs text-muted-foreground text-center mb-3">O que você precisa instalar/fixar?</p>
        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
          {OPCOES.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value, opt.desc)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
            >
              <span className="text-2xl">{opt.emoji}</span>
              <p className="font-bold text-foreground text-xs text-center leading-tight">{opt.value}</p>
              <p className="text-[10px] text-muted-foreground text-center">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}