import React from 'react';
import { AlertCircle, Wrench, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ValvulaTransfModal({ onSelect, onCancel }) {
  const options = [
    {
      value: 'visita_tecnica',
      label: 'Visita Técnica',
      emoji: '🔍',
      desc: 'Diagnóstico e análise de viabilidade',
      color: 'orange',
    },
    {
      value: 'instalacao',
      label: 'Instalação',
      emoji: '🔧',
      desc: 'Instalar válvula transferidora',
      color: 'green',
    },
    {
      value: 'reparo',
      label: 'Reparo',
      emoji: '⚙️',
      desc: 'Manutenção ou conserto',
      color: 'blue',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-foreground mb-1">Válvula Transferidora de Pressão</h3>
          <p className="text-sm text-muted-foreground">Selecione o tipo de serviço necessário</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            A válvula transferidora de pressão é essencial para sistemas de pressurização com segurança aumentada.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                opt.color === 'orange'
                  ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50'
                  : opt.color === 'green'
                  ? 'border-green-200 hover:border-green-400 hover:bg-green-50'
                  : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <p className={`font-bold text-sm ${
                opt.color === 'orange' ? 'text-orange-900' :
                opt.color === 'green' ? 'text-green-900' :
                'text-blue-900'
              }`}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>

        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full mt-5 rounded-2xl"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}