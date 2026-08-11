import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Undo2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logAdminAction } from '@/lib/adminLog';

const REVERT_OPTIONS = [
  {
    fromStatus: 'a_caminho',
    toStatus: 'aceito',
    label: 'Desfazer "A caminho"',
    description: 'Prestador ainda não saiu. Volta para status "Aceito".',
    clientMessage: 'Houve um ajuste no seu atendimento. O prestador ainda não iniciou o deslocamento. Aguarde novas atualizações.',
    icon: '🔄',
  },
  {
    fromStatus: 'em_andamento',
    toStatus: 'a_caminho',
    label: 'Desfazer "Em andamento"',
    description: 'Serviço não havia iniciado. Volta para "A caminho".',
    clientMessage: 'Houve um ajuste no seu atendimento. O prestador ainda está a caminho do seu endereço.',
    icon: '↩️',
  },
  {
    fromStatus: 'aceito',
    toStatus: 'aguardando',
    label: 'Desfazer aceite do prestador',
    description: 'Prestador aceitou por engano. Volta para "Aguardando".',
    clientMessage: 'O prestador anterior não poderá atendê-lo. Estamos buscando um novo profissional para você.',
    icon: '⚠️',
  },
];

export default function UndoProviderAction({ request, adminUser }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  const availableOptions = REVERT_OPTIONS.filter(o => o.fromStatus === request.status);

  const undoMutation = useMutation({
    mutationFn: async ({ option }) => {
      const updateData = { status: option.toStatus };
      // Se desfaz o aceite, remove o prestador do serviço
      if (option.toStatus === 'aguardando') {
        updateData.provider_id = null;
        updateData.provider_name = null;
        updateData.provider_phone = null;
      }
      await base44.entities.ServiceRequest.update(request.id, updateData);

      // Notifica o cliente
      const message = customNote.trim() ? `${option.clientMessage}\n\nNota da equipe: ${customNote.trim()}` : option.clientMessage;
      if (request.client_id) {
        await base44.entities.ClientNotification.create({
          client_id: request.client_id,
          client_email: request.client_email || '',
          type: 'warning',
          title: '⚠️ Atualização no seu atendimento',
          message,
          action_url: `/acompanhar/${request.id}`,
          is_read: false,
        });
      }
    },
    onSuccess: (_, { option }) => {
      queryClient.invalidateQueries({ queryKey: ['all-requests'] });
      toast.success(`Ação desfeita: "${option.label}". Cliente notificado.`);
      logAdminAction({
        action: 'service_status_reverted',
        actorName: adminUser?.full_name || 'Atendente',
        actorEmail: adminUser?.email || '',
        entityType: 'ServiceRequest',
        entityId: request.id,
        entityLabel: `${request.service_type} - ${request.client_name}`,
        oldValue: option.fromStatus,
        newValue: option.toStatus,
        details: customNote || option.description,
      });
      setExpanded(false);
      setSelectedOption(null);
      setCustomNote('');
      },
      onError: () => toast.error('Erro ao desfazer ação.'),
      });

      if (availableOptions.length === 0) return null;

      return (
    <div className="border border-orange-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
      >
        <Undo2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-orange-700 flex-1">Desfazer ação do prestador</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-orange-500" /> : <ChevronDown className="w-3.5 h-3.5 text-orange-500" />}
      </button>

      {expanded && (
        <div className="px-3 py-3 bg-white space-y-3">
          <div className="space-y-2">
            {availableOptions.map(option => (
              <button
                key={option.toStatus}
                onClick={() => setSelectedOption(option)}
                className={cn(
                  "w-full text-left p-2.5 rounded-xl border-2 transition-all text-xs",
                  selectedOption?.toStatus === option.toStatus
                    ? "border-orange-400 bg-orange-50"
                    : "border-border hover:border-orange-300"
                )}
              >
                <p className="font-semibold text-foreground">{option.icon} {option.label}</p>
                <p className="text-muted-foreground mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>

          {selectedOption && (
            <>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Nota adicional para o cliente (opcional)
                </label>
                <textarea
                  value={customNote}
                  onChange={e => setCustomNote(e.target.value)}
                  placeholder="Ex: o prestador foi redirecionado para o endereço correto..."
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2">
                <p className="text-xs text-blue-700 font-semibold mb-0.5">📱 Mensagem enviada ao cliente:</p>
                <p className="text-xs text-blue-600">{selectedOption.clientMessage}{customNote && ` — Nota: ${customNote}`}</p>
              </div>
              <Button
                size="sm"
                disabled={undoMutation.isPending}
                onClick={() => undoMutation.mutate({ option: selectedOption })}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
              >
                {undoMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <><Undo2 className="w-3.5 h-3.5 mr-1" /> Confirmar desfazer e notificar cliente</>
                }
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}