import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, RotateCcw, ShieldCheck, ChevronRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const TIPOS = [
  {
    id: 'retorno_conclusao',
    label: 'Retorno para conclusão do serviço',
    icon: RotateCcw,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    iconColor: 'text-blue-500',
    description: 'O serviço ficou incompleto e preciso que o prestador retorne para finalizar.',
  },
  {
    id: 'retorno_garantia',
    label: 'Retorno em garantia',
    icon: ShieldCheck,
    color: 'border-orange-200 bg-orange-50 text-orange-700',
    iconColor: 'text-orange-500',
    description: 'O serviço foi concluído, mas apresentou um problema e preciso acionar a garantia.',
  },
];

export default function RetornoModal({ request, onClose }) {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!tipo || !descricao.trim()) return;
    setLoading(true);

    // Ambos os tipos abrem uma nova OS de retorno
    const label = tipo === 'retorno_conclusao' ? 'RETORNO CONCLUSÃO' : 'RETORNO GARANTIA';
    const params = new URLSearchParams({
      tipo: request.service_type,
      retorno_de: request.id,
      descricao: `${label} - ${descricao}`,
      provider_id: request.provider_id || '',
    });
    navigate(`/solicitar?${params.toString()}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Solicitar Retorno do Prestador</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Qual é o motivo?</p>
          {TIPOS.map(t => {
            const Icon = t.icon;
            const selected = tipo === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all flex items-start gap-3 ${selected ? t.color + ' border-current' : 'border-border bg-card hover:border-primary/30'}`}
              >
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selected ? t.iconColor : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${selected ? '' : 'text-foreground'}`}>{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </div>
                {selected && <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Descrição */}
        {tipo && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Descreva o ocorrido</p>
            <textarea
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm min-h-[90px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Explique o que aconteceu..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
        )}

        {/* Ação */}
        <Button
          className="w-full rounded-2xl h-11 font-bold"
          disabled={!tipo || !descricao.trim() || loading}
          onClick={handleSubmit}
        >
          📋 Abrir OS de Retorno
        </Button>
      </div>
    </div>
  );
}