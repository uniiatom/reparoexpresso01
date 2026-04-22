import React, { useState } from 'react';
import { X, Clock, MapPin, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ProviderBusyAlertModal({ alert, onClose, onRespond }) {
  const [finishTime, setFinishTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRespond = async () => {
    if (!finishTime || parseInt(finishTime) < 1) {
      toast.error('Informe em quantos minutos você termina');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.ProviderBusyAlert.update(alert.id, {
        finish_time_minutes: parseInt(finishTime),
        status: 'respondido',
        responded_at: new Date().toISOString(),
      });

      toast.success(`Resposta enviada — você termina em ${finishTime} minutos`);
      if (onRespond) onRespond();
      onClose();
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card w-full max-w-lg rounded-t-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Cliente Próximo!</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{alert.client_name}</strong> quer contratar <strong>{alert.service_type.replace(/_/g, ' ')}</strong>
            </p>
            <div className="flex items-center gap-2 text-sm text-orange-700">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{alert.distance_km} km de distância</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Em quantos minutos você termina o atendimento atual?
            </label>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 30].map(time => (
                <button
                  key={time}
                  onClick={() => setFinishTime(String(time))}
                  className={`flex-1 min-w-16 py-2 rounded-xl font-semibold text-sm border-2 transition-all ${
                    finishTime === String(time)
                      ? 'border-orange-600 bg-orange-100 text-orange-900'
                      : 'border-border bg-background text-foreground hover:border-orange-300'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              O cliente verá que você pode atender em breve
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={onClose}
              disabled={submitting}
            >
              Ignorar
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleRespond}
              disabled={submitting || !finishTime}
            >
              {submitting ? 'Enviando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}