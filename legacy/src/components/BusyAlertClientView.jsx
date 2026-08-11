import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle2, User, AlertCircle, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BusyAlertClientView({ alertId, onConfirm, form, onProviderResponded }) {
  const [alert, setAlert] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const notifiedRef = React.useRef(false);

  useEffect(() => {
    if (!alertId) return;
    
    const handleUpdate = (data) => {
      setAlert(data);
      // Quando um prestador responde, notifica o pai para fechar o modal de busca
      const hasResponses = data?.responses?.filter(r => r.can_attend)?.length > 0;
      if (hasResponses && !notifiedRef.current) {
        notifiedRef.current = true;
        if (onProviderResponded) onProviderResponded();
      }
    };

    // Carrega inicial
    base44.entities.BusyAlert.get(alertId).then(handleUpdate).catch(() => {});
    
    // Polling a cada 2 segundos
    const pollInterval = setInterval(() => {
      base44.entities.BusyAlert.get(alertId)
        .then(handleUpdate)
        .catch(() => {});
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [alertId]);

  // Conta o tempo decorrido desde a criação do alerta
  useEffect(() => {
    if (!alert?.created_date) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(alert.created_date).getTime()) / 1000 / 60);
      setTimeElapsed(elapsed);
    }, 1000);
    return () => clearInterval(timer);
  }, [alert?.created_date]);

  const responses = alert?.responses?.filter(r => r.can_attend) || [];
  if (!alert) return null;

  const handleConfirmProvider = async (response) => {
     if (!onConfirm || confirming) return;
     setConfirming(true);

     // Marca o alerta como aceito pelo cliente
     await base44.entities.BusyAlert.update(alertId, { status: 'aceito_pelo_cliente' }).catch(() => {});

     // Chama onConfirm com dados do prestador que vai atender
     const now = new Date();
     const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
     const currentDate = now.toISOString().split('T')[0];
     onConfirm({
       ...form,
       modality: 'imediato',
       urgency: 'agora',
       estimated_arrival_minutes: response.total_eta_minutes,
     });
   };

   const handleCancel = async () => {
     setConfirming(true);
     await base44.entities.BusyAlert.update(alertId, { status: 'cancelado_pelo_cliente' }).catch(() => {});
     setConfirming(false);
     setAlert(null);
     // Volta pra página anterior após cancelar
     window.history.back();
   };

  // Se não há respostas ainda
  if (responses.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Buscando prestadores próximos...
        </p>
        <p className="text-xs text-amber-700">
          ⏱️ Prestadores em atendimento próximos a você foram notificados. Aguarde a resposta deles.
        </p>
        {timeElapsed > 0 && (
          <p className="text-xs text-amber-600 mt-2">Tempo decorrido: {timeElapsed} min</p>
        )}
      </div>
    );
  }

  // Há respostas de prestadores — mostrar botão para confirmar
  return (
    <div className="mt-4 rounded-2xl border-2 border-green-400 bg-green-50 p-4">
      <p className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        {responses.length === 1 ? '🎉 Um prestador pode te atender!' : `🎉 ${responses.length} prestadores podem te atender!`}
      </p>
      <div className="space-y-3">
        {responses.map((r, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border-2 border-green-300 space-y-3">
            {/* Info do prestador */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{r.provider_name}</p>
                <p className="text-xs text-muted-foreground">Prestador disponível após serviço atual</p>
              </div>
            </div>

            {/* Detalhamento do tempo */}
            <div className="bg-green-50 rounded-xl p-3 border border-green-200 space-y-2">
              <p className="text-xs font-bold text-green-800 mb-1">⏱️ Estimativa de chegada:</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Termina atendimento atual em:</span>
                <span className="font-semibold text-foreground">~{r.finish_in_minutes} min</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tempo de deslocamento até você:</span>
                <span className="font-semibold text-foreground">~{r.travel_minutes || 0} min</span>
              </div>
              <div className="h-px bg-green-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-green-800">Total estimado para chegar:</span>
                <span className="text-lg font-black text-green-700">~{r.total_eta_minutes} min</span>
              </div>
            </div>

            {/* Botão confirmar */}
            {onConfirm && (
              <Button
                onClick={() => handleConfirmProvider(r)}
                disabled={confirming}
                className="w-full h-11 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                {confirming
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Zap className="w-4 h-4 mr-1" /> Confirmar atendimento em ~{r.total_eta_minutes} min</>
                }
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          onClick={handleCancel}
          disabled={confirming}
          variant="outline"
          className="flex-1 rounded-xl border-destructive text-destructive hover:bg-destructive/5"
        >
          Cancelar solicitação
        </Button>
      </div>
      </div>
  );
}