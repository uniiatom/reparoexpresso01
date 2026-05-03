import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, RotateCcw, ShieldCheck, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

const TIPOS = [
  {
    id: 'retorno_peca',
    label: 'Retorno por Peça',
    icon: RotateCcw,
    color: 'border-blue-300 bg-blue-50 text-blue-800',
    iconColor: 'text-blue-500',
    badgeBg: 'bg-blue-100 text-blue-700',
    description: 'O prestador solicitou uma peça para conclusão do atendimento e já a providenciei.',
    prazoLabel: 'Prazo: até 15 dias corridos após a conclusão',
    prazoMax: 15,
    emoji: '🔧',
  },
  {
    id: 'retorno_garantia',
    label: 'Retorno em Garantia',
    icon: ShieldCheck,
    color: 'border-orange-300 bg-orange-50 text-orange-800',
    iconColor: 'text-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700',
    description: 'O serviço apresentou um problema após a conclusão e preciso acionar a garantia.',
    prazoLabel: 'Prazo: até 90 dias corridos após a conclusão',
    prazoMax: 90,
    emoji: '🛡️',
  },
];

export default function RetornoModal({ request, onClose }) {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  // Calcula quantos dias se passaram desde a conclusão
  const conclusaoDate = request?.updated_date ? new Date(request.updated_date) : null;
  const diasPassados = conclusaoDate ? differenceInDays(new Date(), conclusaoDate) : 0;

  const tipoSelecionado = TIPOS.find(t => t.id === tipo);
  const prazoExpirado = tipoSelecionado ? diasPassados > tipoSelecionado.prazoMax : false;
  const diasRestantes = tipoSelecionado ? tipoSelecionado.prazoMax - diasPassados : 0;

  const handleSubmit = async () => {
    if (!tipo || !descricao.trim() || prazoExpirado) return;
    setLoading(true);

    const label = tipo === 'retorno_peca' ? 'RETORNO POR PEÇA' : 'RETORNO GARANTIA';
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
          <div>
            <h2 className="text-lg font-bold text-foreground">Solicitar Retorno</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {diasPassados === 0
                ? 'Serviço concluído hoje'
                : `Concluído há ${diasPassados} dia${diasPassados > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tipo */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Qual é o motivo do retorno?</p>
          {TIPOS.map(t => {
            const Icon = t.icon;
            const selected = tipo === t.id;
            const expirado = diasPassados > t.prazoMax;
            const restantes = t.prazoMax - diasPassados;

            return (
              <button
                key={t.id}
                onClick={() => !expirado && setTipo(t.id)}
                disabled={expirado}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all flex items-start gap-3
                  ${expirado
                    ? 'border-border bg-muted/40 opacity-60 cursor-not-allowed'
                    : selected
                      ? t.color + ' border-current'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${expirado ? 'bg-muted' : selected ? 'bg-white/70' : 'bg-muted'}`}>
                  {t.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${expirado ? 'text-muted-foreground' : selected ? '' : 'text-foreground'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                  <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${expirado ? 'bg-red-100 text-red-600' : selected ? t.badgeBg : 'bg-muted text-muted-foreground'}`}>
                    <Clock className="w-3 h-3" />
                    {expirado
                      ? `Prazo expirado (${t.prazoMax} dias)`
                      : restantes <= 5
                        ? `⚠️ ${restantes} dia${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}`
                        : t.prazoLabel
                    }
                  </div>
                </div>
                {selected && !expirado && <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Alerta de prazo quase expirando */}
        {tipoSelecionado && !prazoExpirado && diasRestantes <= 5 && diasRestantes > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-semibold">
              Atenção! Você tem apenas <strong>{diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}</strong> para solicitar este retorno.
            </p>
          </div>
        )}

        {/* Prazo expirado para o tipo escolhido (caso tente selecionar) */}
        {prazoExpirado && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-800 font-semibold">
              O prazo para este tipo de retorno expirou.
            </p>
          </div>
        )}

        {/* Descrição */}
        {tipo && !prazoExpirado && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Descreva o ocorrido</p>
            <textarea
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm min-h-[90px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={
                tipo === 'retorno_peca'
                  ? 'Informe qual peça foi adquirida e o que resta ser feito...'
                  : 'Descreva detalhadamente o problema apresentado no serviço...'
              }
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
        )}

        {/* Ação */}
        <Button
          className="w-full rounded-2xl h-11 font-bold"
          disabled={!tipo || !descricao.trim() || loading || prazoExpirado}
          onClick={handleSubmit}
        >
          📋 Abrir OS de Retorno
        </Button>

        {/* Info de prazos */}
        <div className="bg-muted/50 rounded-2xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-foreground">📌 Prazos para solicitar retorno:</p>
          <p className="text-xs text-muted-foreground">🔧 Retorno por Peça: <strong>até 15 dias corridos</strong> após a conclusão</p>
          <p className="text-xs text-muted-foreground">🛡️ Garantia: <strong>até 90 dias corridos</strong> após a conclusão</p>
        </div>
      </div>
    </div>
  );
}