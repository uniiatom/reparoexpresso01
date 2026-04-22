import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, MapPin, CheckCircle2, User, AlertCircle } from "lucide-react";

export default function BusyAlertClientView({ alertId }) {
  const [alert, setAlert] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!alertId) return;
    base44.entities.BusyAlert.get(alertId).then(setAlert).catch(() => {});
    const unsub = base44.entities.BusyAlert.subscribe((event) => {
      if (event.id === alertId && event.data) setAlert(event.data);
    });
    return unsub;
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

  // Se não há respostas ainda
  if (responses.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Buscando prestadores próximos...
        </p>
        <p className="text-xs text-amber-700">
          ⏱️ A busca pode levar até 5 minutos. Você será notificado quando um prestador responder.
        </p>
        {timeElapsed > 0 && (
          <p className="text-xs text-amber-600 mt-2">Tempo decorrido: {timeElapsed} min</p>
        )}
      </div>
    );
  }

  // Há respostas de prestadores
  return (
    <div className="mt-4 rounded-2xl border-2 border-green-300 bg-green-50 p-4">
      <p className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        {responses.length === 1 ? '1 prestador pode te atender!' : `${responses.length} prestadores podem te atender!`}
      </p>
      <div className="space-y-2">
        {responses.map((r, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-green-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.provider_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Finaliza em ~{r.finish_in_minutes} min
                {r.travel_minutes > 0 && ` · +${r.travel_minutes} min deslocamento`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-green-700">~{r.total_eta_minutes} min</p>
              <p className="text-[10px] text-green-600">tempo total</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-green-700 mt-3">
        Você pode agendar agora ou aguardar. Se o prestador não conseguir em até 30 min, a agenda será aberta para outro profissional.
      </p>
    </div>
  );
}