import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Ban, RotateCw, X, Loader2, ClipboardList, Package, Wrench } from "lucide-react";
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
    id: 'needs_part',
    label: 'Necessário Peça',
    icon: Package,
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    description: 'Precisará de uma peça/material para completar',
    requiresReason: true,
  },
  {
    id: 'technical_visit',
    label: 'Visita Técnica',
    icon: Wrench,
    color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    description: 'Será necessária uma visita técnica adicional',
    requiresReason: true,
  },
  {
    id: 'unsuccessful',
    label: 'Concluído Sem Sucesso',
    icon: AlertCircle,
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    description: 'Serviço executado, mas não resolveu o problema',
    requiresReason: true,
  },
];

export default function ServiceCompletionModal({ service, onSuccess, onCancel }) {
  const [step, setStep] = useState('select'); // 'select' | 'reason'
  const [selectedOption, setSelectedOption] = useState(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  console.log('[ServiceCompletionModal] Service:', service);

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

  if (!service) return null;

  const checklistDone = !!service.checklist?.completed_at;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-border p-6 flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Concluir Serviço</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {service.service_number || 'Serviço'} - {service.service_type}
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
          {/* Bloqueio se checklist não preenchido */}
          {!checklistDone ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">Checklist obrigatório</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Preencha o checklist do serviço antes de finalizar o atendimento.
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-xs text-orange-700 font-medium">
                ⚠️ Não é possível concluir o serviço sem o checklist preenchido.
              </div>
              <Button variant="outline" onClick={onCancel} className="rounded-xl mt-2">
                Fechar e preencher checklist
              </Button>
            </div>
          ) : step === 'select' ? (
            <div className="space-y-3">
              {COMPLETION_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Opção selecionada:</p>
                <div className="flex items-center gap-2">
                  {selectedOption && (
                    <>
                      <selectedOption.icon className="w-5 h-5 text-primary" />
                      <p className="font-semibold text-foreground">{selectedOption.label}</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-2">
                    {selectedOption?.id === 'needs_part' && 'Qual peça/material é necessário?'}
                    {selectedOption?.id === 'technical_visit' && 'Por que é necessária uma visita técnica?'}
                    {selectedOption?.id === 'unsuccessful' && 'Por que o serviço não teve sucesso?'}
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      selectedOption?.id === 'needs_part'
                        ? 'Descreva qual peça/material é necessário e especificações...'
                        : selectedOption?.id === 'technical_visit'
                        ? 'Explique o que precisa ser feito na visita técnica...'
                        : 'Descreva o motivo pelo qual o problema não foi resolvido...'
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
                  disabled={submitCompletion.isPending || (selectedOption?.requiresReason && !reason.trim())}
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
      </motion.div>
    </div>
  );
}