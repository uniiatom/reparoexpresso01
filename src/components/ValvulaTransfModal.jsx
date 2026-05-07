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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-4 pb-6 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
        
        <div className="text-center mb-4">
          <h3 className="text-base font-bold text-foreground mb-0.5">Válvula Transferidora de Pressão</h3>
          <p className="text-xs text-muted-foreground">Selecione o tipo de serviço</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 mb-4 flex items-start gap-2">
          <AlertCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-700">
            Selecione se precisa de diagnóstico, instalação ou reparo da válvula.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                opt.color === 'orange'
                  ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50'
                  : opt.color === 'green'
                  ? 'border-green-200 hover:border-green-400 hover:bg-green-50'
                  : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
              <div className="text-left">
                <p className={`font-bold text-xs ${
                  opt.color === 'orange' ? 'text-orange-900' :
                  opt.color === 'green' ? 'text-green-900' :
                  'text-blue-900'
                }`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full mt-4 rounded-xl text-sm"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}