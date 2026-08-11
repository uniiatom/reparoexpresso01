import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Bell, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EstimateApprovalPanel({ 
  requestId, 
  estimatedPrice, 
  serviceType,
  clientName,
  providerName,
  description,
  onApprovalChange,
  currentStatus = 'aguardando'
}) {
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  // Busca status atual do serviço
  const { data: service, isLoading } = useQuery({
    queryKey: ['service-status', requestId],
    queryFn: () => base44.entities.ServiceRequest.filter({ id: requestId })
      .then(data => data[0]),
    enabled: !!requestId,
    refetchInterval: 5000 // Atualiza a cada 5 segundos
  });

  // Mutation para aprovar
  const approveMutation = useMutation({
    mutationFn: () => base44.functions.invoke('approveServiceEstimate', {
      request_id: requestId,
      approved: true,
      notes: ''
    }),
    onSuccess: (response) => {
      setNotificationSent(true);
      if (onApprovalChange) onApprovalChange('aceito');
      
      // Toca som de aprovação
      playApprovalSound();
    },
  });

  // Mutation para rejeitar
  const rejectMutation = useMutation({
    mutationFn: () => base44.functions.invoke('approveServiceEstimate', {
      request_id: requestId,
      approved: false,
      notes: rejectionNotes
    }),
    onSuccess: (response) => {
      setNotificationSent(true);
      setShowRejectionForm(false);
      if (onApprovalChange) onApprovalChange('cancelado');
      
      // Toca som de rejeição
      playRejectSound();
    },
  });

  // Função para tocar som
  const playApprovalSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
    audio.play().catch(() => {});
  };

  const playRejectSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
    audio.play().catch(() => {});
  };

  // Requisita permissão de notificações
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Envia notificação push quando orçamento está pronto
  useEffect(() => {
    if (service && service.estimated_price && !service.approval_notes && 
        currentStatus === 'aguardando' && 'Notification' in window && 
        Notification.permission === 'granted' && !notificationSent) {
      
      new Notification('Novo Orçamento Disponível! 🔧', {
        body: `${providerName} enviou um orçamento de R$ ${service.estimated_price.toFixed(2)} para ${serviceType}`,
        icon: '🔔',
        tag: `estimate-${requestId}`,
        requireInteraction: true,
        actions: [
          { action: 'approve', title: 'Aprovar' },
          { action: 'reject', title: 'Rejeitar' }
        ]
      });

      setNotificationSent(true);
    }
  }, [service, estimatedPrice, requestId, serviceType, providerName, currentStatus, notificationSent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // Se já foi aprovado ou rejeitado
  if (service?.approval_notes || service?.status === 'aceito' || service?.status === 'cancelado') {
    return (
      <Card className={cn(
        service?.status === 'aceito' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {service?.status === 'aceito' ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={cn(
                "font-bold text-sm mb-1",
                service?.status === 'aceito' ? 'text-green-900' : 'text-red-900'
              )}>
                {service?.status === 'aceito' ? '✅ Orçamento Aprovado' : '❌ Orçamento Recusado'}
              </h3>
              <p className={cn(
                "text-sm",
                service?.status === 'aceito' ? 'text-green-800' : 'text-red-800'
              )}>
                {service?.status === 'aceito'
                  ? 'Você aprovou este orçamento. O prestador já foi notificado.'
                  : 'Você recusou este orçamento. Você pode solicitar um novo orçamento ou conversar com o prestador.'}
              </p>
              {service?.approval_notes && (
                <p className={cn(
                  "text-xs mt-2 p-2 rounded bg-white/50",
                  service?.status === 'aceito' ? 'text-green-700' : 'text-red-700'
                )}>
                  <strong>Nota:</strong> {service.approval_notes}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-2">
                {new Date(service?.approved_at).toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 text-sm mb-0.5">Orçamento Aguardando Aprovação</h3>
            <p className="text-xs text-blue-800">
              {providerName} enviou um orçamento para você validar
            </p>
          </div>
          <Bell className="w-5 h-5 text-blue-500 animate-bounce flex-shrink-0" />
        </div>

        {/* Detalhes do Orçamento */}
        <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tipo de Serviço:</span>
            <span className="font-semibold text-foreground">{serviceType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Prestador:</span>
            <span className="font-semibold text-foreground">{providerName}</span>
          </div>
          <div className="border-t border-border pt-2">
            <span className="text-muted-foreground">Descrição:</span>
            <p className="text-xs text-foreground mt-1">{description}</p>
          </div>
          <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">Orçamento:</span>
            <span className="text-xl font-black text-blue-600">
              R$ {estimatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Botões de Ação - Formulário Normal */}
        {!showRejectionForm ? (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="flex-1 h-11 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Aprovar Orçamento
            </Button>
            <Button
              onClick={() => setShowRejectionForm(true)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              variant="outline"
              className="flex-1 h-11 rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
          </div>
        ) : (
          // Formulário de Rejeição
          <div className="space-y-3 pt-2 border-t border-blue-200">
            <Label className="text-sm font-semibold text-foreground">
              Por que está rejeitando? (opcional)
            </Label>
            <Textarea
              placeholder="Ex: Valor acima do esperado, prefiro buscar alternativas, não é o momento, etc."
              value={rejectionNotes}
              onChange={e => setRejectionNotes(e.target.value)}
              className="min-h-[80px] rounded-xl text-sm"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || approveMutation.isPending}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Confirmar Rejeição
              </Button>
              <Button
                onClick={() => {
                  setShowRejectionForm(false);
                  setRejectionNotes('');
                }}
                disabled={rejectMutation.isPending || approveMutation.isPending}
                variant="outline"
                className="flex-1 h-10 rounded-xl text-sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Info de Ação Rápida */}
        <div className="bg-blue-100 rounded-lg p-2 text-xs text-blue-800 flex items-start gap-2">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Dica:</strong> Você receberá uma notificação push. Pode aprovar ou rejeitar com um clique, sem entrar no app.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}