import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, MapPin, CheckCircle2, User } from "lucide-react";

export default function BusyAlertClientView({ alertId }) {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!alertId) return;
    base44.entities.BusyAlert.get(alertId).then(setAlert).catch(() => {});
    const unsub = base44.entities.BusyAlert.subscribe((event) => {
      if (event.id === alertId && event.data) setAlert(event.data);
    });
    return unsub;
  }, [alertId]);

  const responses = alert?.responses?.filter(r => r.can_attend) || [];
  if (!alert || responses.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border-2 border-blue-300 bg-blue-50 p-4">
      <p className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        {responses.length === 1 ? '1 prestador pode te atender!' : `${responses.length} prestadores podem te atender!`}
      </p>
      <div className="space-y-2">
        {responses.map((r, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-blue-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
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
              <p className="text-sm font-bold text-blue-700">~{r.total_eta_minutes} min</p>
              <p className="text-[10px] text-blue-500">tempo total</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-blue-600 mt-3">
        Agende agora ou aguarde — caso prefira atendimento imediato após a finalização do prestador acima.
      </p>
    </div>
  );
}