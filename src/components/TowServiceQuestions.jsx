import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function TowServiceQuestions({ answers, onChange }) {
  const questions = [
    { key: 'easy_access', label: 'Veículo está de fácil acesso?' },
    { key: 'locked_wheel', label: 'Veículo possui alguma roda travada?' },
    { key: 'lowered', label: 'Veículo é rebaixado?' },
    { key: 'location_allows', label: 'Local permite fazer a remoção do veículo?' },
    { key: 'has_victims', label: 'Tem vítimas no local?' },
  ];

  const handleAnswer = (key, value) => {
    onChange({ ...answers, [key]: value });
  };

  const allAnswered = questions.every(q => answers[q.key] !== undefined);
  const hasVictims = answers.has_victims === true;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">Informações importantes</h3>
        <p className="text-muted-foreground text-sm">Responda as perguntas sobre a situação do veículo</p>
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.key} className="space-y-2">
            <label className="text-sm font-semibold text-foreground">{q.label}</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer(q.key, true)}
                className={cn(
                  "flex-1 py-3 rounded-2xl border-2 font-semibold text-sm transition-all",
                  answers[q.key] === true
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-border hover:border-primary/40 text-foreground"
                )}
              >
                Sim
              </button>
              <button
                onClick={() => handleAnswer(q.key, false)}
                className={cn(
                  "flex-1 py-3 rounded-2xl border-2 font-semibold text-sm transition-all",
                  answers[q.key] === false
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-border hover:border-primary/40 text-foreground"
                )}
              >
                Não
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasVictims && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-200 space-y-2">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">⚠️ Situação de emergência</p>
              <p className="text-xs text-red-600 mt-1">
                Há vítimas no local. Você <strong>DEVE aguardar a chegada da polícia</strong> antes de solicitar o reboque. Não remova o veículo até que a polícia registre o ocorrido.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasVictims && allAnswered && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <p className="text-sm font-semibold text-blue-900">✓ Pronto para solicitar reboque</p>
          <p className="text-xs text-blue-700 mt-1">Você pode prosseguir com a solicitação do serviço</p>
        </div>
      )}

      {answers.locked_wheel === true && (
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200 space-y-2">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-700 text-sm">⚠️ Roda travada</p>
              <p className="text-xs text-orange-600 mt-1">
                Será necessário usar carrinho para movimentação. <strong>Essa taxa será cobrada à parte no local.</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {answers.lowered === true && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-200 space-y-2">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">⚠️ Veículo rebaixado</p>
              <p className="text-xs text-red-600 mt-1">
                Você está ciente de que <strong>pode haver danos ao parachoque</strong> durante o reboque. <strong>A plataforma Reparo Expresso e o reboquista não se responsabilizam por danos causados durante a remoção do veículo.</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {!answers.easy_access && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-3">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-700 text-sm">⚠️ Acesso difícil</p>
              <p className="text-xs text-amber-600 mt-1">
                Se for necessário usar equipamento especial (correntes, polia, etc.), será cobrado uma taxa adicional no local.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-amber-900">Descreva como está o carro:</label>
            <Textarea
              placeholder="Ex: Carro virado, em vala, amarrado em árvore, preso em mato, etc."
              value={answers.vehicle_condition || ''}
              onChange={(e) => handleAnswer('vehicle_condition', e.target.value)}
              className="min-h-[80px] rounded-xl text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}