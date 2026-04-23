import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle2, User, AlertCircle, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BusyAlertClientView({ alertId, onConfirm, form }) {
  const [alert, setAlert] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!alertId) return;
    
    // Carrega inicial
    base44.entities.BusyAlert.get(alertId).then(setAlert).catch(() => {});
    
    // Polling a cada 2 segundos
    const pollInterval = setInterval(() => {
      base44.entities.BusyAlert.get(alertId)
        .then(setAlert)
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
    <div className="mt-3 rounded-2xl border-2 border-green-400 bg-green-50 p-3">
      <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {responses.length === 1 ? '🎉 Um prestador pode te atender!' : `🎉 ${responses.length} prestadores podem te atender!`}
      </p>
      <div className="space-y-2">
        {responses.map((r, i) => (
          <div key={i} className="bg-white rounded-xl p-2.5 border border-green-300 space-y-2">
            {/* Info resumida */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs font-bold text-foreground truncate">{r.provider_name}</p>
              </div>
              <span className="text-sm font-black text-green-700 whitespace-nowrap">~{r.total_eta_minutes} min</span>
            </div>

            {/* Detalhes compactos */}
            <div className="flex gap-3 text-xs text-muted-foreground px-1">
              <span>🔧 {r.finish_in_minutes} min p/ terminar</span>
              <span>🚗 {r.travel_minutes || 0} min deslocamento</span>
            </div>

            {/* Botão confirmar */}
            {onConfirm && (
              <Button
                onClick={() => handleConfirmProvider(r)}
                disabled={confirming}
                className="w-full h-9 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                {confirming
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <><Zap className="w-3.5 h-3.5 mr-1" /> Confirmar em ~{r.total_eta_minutes} min</>
                }
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}