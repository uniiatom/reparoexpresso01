import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Ban, RotateCw, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const COMPLETION_OPTIONS = [
  {
    id: 'success',
    label: 'Concluído com Sucesso',
    icon: CheckCircle2,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    description: 'Serviço executado conforme solicitado',
    requiresReason: false,
  },
  {
    id: 'unsuccessful',
    label: 'Concluído Sem Sucesso',
    icon: AlertCircle,
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    description: 'Serviço executado, mas não resolveu o problema',
    requiresReason: true,
  },
  {
    id: 'not_service_type',
    label: 'Não Fazemos Esse Tipo',
    icon: Ban,
    color: 'bg-red-50 border-red-200 hover:bg-red-100',
    description: 'Serviço fora do escopo de atuação',
    requiresReason: true,
  },
  {
    id: 'needs_return',
    label: 'Necessário Retorno',
    icon: RotateCw,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    description: 'Precisa de uma nova visita para completar',
    requiresReason: true,
  },
];

export default function ServiceCompletionModal({ service, onSuccess, onCancel }) {
  const [step, setStep] = useState('select'); // 'select' | 'reason'
  const [selectedOption, setSelectedOption] = useState(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const submitCompletion = useMutation({
    mutationFn: async () => {
      if (!selectedOption) {
        throw new Error('Selecione uma opção de conclusão');
      }

      const completionData = {
        service_request_id: service.id,
        completion_type: selectedOption.id,
        reason: reason.trim() || null,
      };

      console.log('Enviando conclusão:', completionData);

      const response = await base44.functions.invoke('completeServiceRequest', completionData);
      console.log('Resposta:', response);
      return response;
    },
    onSuccess: () => {
      console.log('✓ Serviço concluído com sucesso');
      toast.success('Serviço atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['acceptedServices'] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Erro ao completar:', error);
      toast.error(error.message || 'Erro ao completar serviço');
    },
  });

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    if (option.requiresReason) {
      setStep('reason');
    } else {
      // Sucesso direto sem justificativa
      submitCompletion.mutate();
    }
  };

  const handleSubmitReason = () => {
    if (!reason.trim() && selectedOption.requiresReason) {
      toast.error('Preencha a justificativa');
      return;
    }
    submitCompletion.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-6 flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Concluir Serviço</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {service?.service_number || 'Serviço'} - {service?.service_type}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {step === 'select' ? (
            // Tela de seleção
            <div className="space-y-3">
              {COMPLETION_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${option.color}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-6 h-6 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{option.label}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            // Tela de justificativa
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Opção selecionada:</p>
                <div className="flex items-center gap-2">
                  {selectedOption && <selectedOption.icon className="w-5 h-5 text-primary" />}
                  <p className="font-semibold text-foreground">{selectedOption?.label}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-2">
                  {selectedOption?.id === 'unsuccessful' && 'Por que o serviço não teve sucesso?'}
                  {selectedOption?.id === 'not_service_type' && 'Por que não fazem esse tipo de serviço?'}
                  {selectedOption?.id === 'needs_return' && 'Por que é necessário um retorno?'}
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    selectedOption?.id === 'unsuccessful'
                      ? 'Descreva o motivo pelo qual o problema não foi resolvido...'
                      : selectedOption?.id === 'not_service_type'
                      ? 'Explique por que seu serviço não cobre este tipo de atendimento...'
                      : 'Descreva o que precisa ser feito no próximo retorno...'
                  }
                  className="w-full h-28 p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reason.length}/500 caracteres
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep('select');
                    setReason('');
                  }}
                  className="flex-1 rounded-xl h-11"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitReason}
                  disabled={submitCompletion.isPending || !reason.trim()}
                  className="flex-1 rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submitCompletion.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}