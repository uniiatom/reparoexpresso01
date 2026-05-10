import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, RotateCcw, ShieldCheck, ChevronRight, AlertTriangle, Clock, User, Users } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import InteractiveScheduleCalendar from '@/components/InteractiveScheduleCalendar';

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
  const [agendarComOriginal, setAgendarComOriginal] = useState(null); // true=mesmo prestador, false=outro
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [navigateParams, setNavigateParams] = useState(null);

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
    });

    // Se escolheu mesmo prestador, passa o provider_id para pré-selecionar
    if (agendarComOriginal && request.provider_id) {
      params.set('provider_id', request.provider_id);
    }
    // Se escolheu agendamento com data/hora, passa como agendado
    if (scheduledDate && scheduledTime) {
      params.set('modality', 'agendado');
      params.set('scheduled_date', scheduledDate);
      params.set('scheduled_time', scheduledTime);
    }

    setNavigateParams(params.toString());
    setLoading(false);
    setSucesso(true);
  };

  // Mostra passo de agendamento depois de preencher tipo + descrição
  const showAgendamento = tipo && !prazoExpirado && descricao.trim().length >= 5;

  if (sucesso) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
        <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-xl font-bold text-foreground">Retorno aberto com sucesso!</h3>
          <p className="text-sm text-muted-foreground">
            Sua solicitação de retorno foi registrada. Em instantes você será redirecionado para buscar um prestador.
          </p>
          <Button
            className="w-full rounded-2xl h-11 font-bold"
            onClick={() => { navigate(`/solicitar?${navigateParams}`); onClose(); }}
          >
            Continuar →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-4 space-y-3 max-h-[92vh] overflow-y-auto">
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
                className={`w-full text-left rounded-2xl border-2 p-3 transition-all flex items-start gap-3
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

        {/* Alertas de atenção por tipo */}
        {tipo === 'retorno_peca' && !prazoExpirado && (
          <div className="bg-red-50 border border-red-300 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-800">⚠️ Atenção antes de continuar!</p>
              <p className="text-xs text-red-700">
                Se a peça adquirida for <strong>incompatível ou incorreta</strong>, o retorno por peça <strong>não será autorizado</strong> e você perderá o direito a este retorno gratuito. Certifique-se de comprar exatamente a peça indicada pelo prestador.
              </p>
            </div>
          </div>
        )}
        {tipo === 'retorno_garantia' && !prazoExpirado && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-800">⚠️ Atenção sobre a cobertura da garantia!</p>
              <p className="text-xs text-amber-700">
                A garantia cobre <strong>apenas o local exato</strong> onde o prestador realizou o atendimento original. Se o problema ocorrer em <strong>outro ponto ou por outro motivo</strong>, será necessário um <strong>novo serviço ou visita técnica</strong> com cobrança normal.
              </p>
            </div>
          </div>
        )}

        {/* Descrição */}
        {tipo && !prazoExpirado && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Descreva o ocorrido</p>
            <textarea
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
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

        {/* Passo: escolher prestador */}
        {showAgendamento && (
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground">Atendimento com quem?</p>
            <div className="grid grid-cols-2 gap-3">
              {request?.provider_id && (
              <button
                onClick={() => setAgendarComOriginal(true)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  agendarComOriginal === true
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <User className={`w-6 h-6 ${agendarComOriginal === true ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`text-xs font-bold text-center leading-tight ${agendarComOriginal === true ? 'text-primary' : 'text-foreground'}`}>
                  {request?.provider_name || 'Mesmo prestador'}
                </p>
                <p className="text-[10px] text-muted-foreground text-center">Prestador original</p>
              </button>
              )}
              <button
                onClick={() => setAgendarComOriginal(false)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  agendarComOriginal === false
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <Users className={`w-6 h-6 ${agendarComOriginal === false ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`text-xs font-bold text-center leading-tight ${agendarComOriginal === false ? 'text-primary' : 'text-foreground'}`}>
                  Outro prestador
                </p>
                <p className="text-[10px] text-muted-foreground text-center">Disponível na área</p>
              </button>
            </div>

            {/* Agenda do prestador original */}
            {agendarComOriginal === true && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Escolha uma data e horário para o retorno:</p>
                <InteractiveScheduleCalendar
                  selectedDate={scheduledDate}
                  selectedTime={scheduledTime}
                  onDateChange={setScheduledDate}
                  onTimeChange={setScheduledTime}
                  providerId={request?.provider_id}
                />
              </div>
            )}

            {agendarComOriginal === false && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-800">
                ℹ️ Você será redirecionado para buscar um prestador disponível na região.
              </div>
            )}
          </div>
        )}

        {/* Ação */}
        <Button
          className="w-full rounded-2xl h-11 font-bold"
          disabled={
            !tipo || !descricao.trim() || loading || prazoExpirado ||
            (request?.provider_id ? agendarComOriginal === null : false) ||
            (agendarComOriginal === true && (!scheduledDate || !scheduledTime))
          }
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