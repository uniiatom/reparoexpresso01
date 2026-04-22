import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  desentupimento: "Desentupimento", limpeza_caixa_dagua: "Caixa d'Água",
  instalacao_suporte_tv: "Suporte de TV", outros: "Outros",
};

function calcDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function estMinutesOSRM(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data?.routes?.[0]?.duration) return Math.max(1, Math.round(data.routes[0].duration / 60));
  } catch (e) { /* fallback */ }
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(2, Math.round((distKm * 1.3 / 50) * 60));
}

export default function BusyAlertBanner({ provider }) {
  const [alerts, setAlerts] = useState([]);
  const [respondingTo, setRespondingTo] = useState(null); // alert id
  const [finishMinutes, setFinishMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const audioRef = useRef(null);

  useEffect(() => {
    if (!provider?.id || !provider?.is_online) return;

    const loadAlerts = async () => {
      const all = await base44.entities.BusyAlert.filter({ status: 'aguardando' });
      // Filtra alertas não expirados que notificaram este prestador
      const now = new Date();
      const relevant = all.filter(a => {
        if (dismissed.has(a.id)) return false;
        if (a.expires_at && new Date(a.expires_at) < now) return false;
        if (!a.notified_provider_ids?.includes(provider.id)) return false;
        // Já respondeu?
        if (a.responses?.some(r => r.provider_id === provider.id)) return false;
        return true;
      });
      setAlerts(relevant);
      if (relevant.length > 0) playBeep();
    };

    loadAlerts();
    const unsub = base44.entities.BusyAlert.subscribe(() => loadAlerts());
    return unsub;
  }, [provider?.id, provider?.is_online, dismissed]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      [0, 0.4, 0.8].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + delay + 0.05);
        gain.gain.setValueAtTime(0.6, ctx.currentTime + delay + 0.25);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
      setTimeout(() => ctx.close(), 2000);
    } catch (e) { /* silent */ }
  };

  const handleRespond = async (alert, canAttend) => {
    if (!canAttend) {
      // Apenas marca como não disponível (descarta)
      setDismissed(prev => new Set([...prev, alert.id]));
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      toast.info("Resposta registrada.");
      return;
    }
    setRespondingTo(alert.id);
  };

  const handleSubmitFinishTime = async (alert) => {
    const mins = parseInt(finishMinutes);
    if (!mins || mins < 1) return;
    setSubmitting(true);

    // Calcula tempo de deslocamento
    const pLat = provider.latitude;
    const pLon = provider.longitude;
    const cLat = alert.client_latitude;
    const cLon = alert.client_longitude;
    const travelMins = await estMinutesOSRM(pLat, pLon, cLat, cLon);
    const totalEta = mins + (travelMins || 0);

    const response = {
      provider_id: provider.id,
      provider_name: provider.name,
      can_attend: true,
      finish_in_minutes: mins,
      travel_minutes: travelMins || 0,
      total_eta_minutes: totalEta,
      responded_at: new Date().toISOString(),
    };

    const updatedResponses = [...(alert.responses || []), response];
    await base44.entities.BusyAlert.update(alert.id, {
      responses: updatedResponses,
      status: 'prestador_respondeu',
    });

    setDismissed(prev => new Set([...prev, alert.id]));
    setAlerts(prev => prev.filter(a => a.id !== alert.id));
    setRespondingTo(null);
    setFinishMinutes('');
    setSubmitting(false);
    toast.success(`Resposta enviada! O cliente será informado que você estará disponível em ~${totalEta} min.`);
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {alerts.map(alert => {
        const dist = calcDistance(provider.latitude, provider.longitude, alert.client_latitude, alert.client_longitude);
        const isResponding = respondingTo === alert.id;

        return (
          <div key={alert.id} className="bg-orange-50 border-2 border-orange-400 rounded-3xl p-4 animate-pulse-once">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-sm font-bold text-orange-800">⚡ Cliente próximo aguardando!</p>
              {dist != null && (
                <span className="ml-auto text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  ~{dist.toFixed(1)} km
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl p-3 mb-3 space-y-1 border border-orange-200">
              <p className="text-sm font-semibold text-foreground">{SERVICE_LABELS[alert.service_type] || alert.service_type}</p>
              {alert.service_description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{alert.service_description}</p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {alert.client_address || 'Endereço não informado'}
              </p>
              <p className="text-xs text-orange-700 font-semibold">
                👤 {alert.client_name}
              </p>
            </div>

            {!isResponding ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-2xl border-destructive text-destructive hover:bg-destructive/5 text-xs"
                  onClick={() => handleRespond(alert, false)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Não posso atender
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                  onClick={() => handleRespond(alert, true)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Consigo atender!
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    Em quantos minutos você finaliza o atendimento atual?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[15, 30, 45, 60, 90, 120].map(m => (
                      <button
                        key={m}
                        onClick={() => setFinishMinutes(String(m))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${finishMinutes === String(m) ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-border text-foreground'}`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Outro valor em minutos..."
                    value={finishMinutes}
                    onChange={e => setFinishMinutes(e.target.value)}
                    className="mt-2 w-full h-9 px-3 rounded-xl border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-2xl text-xs"
                    onClick={() => { setRespondingTo(null); setFinishMinutes(''); }}
                  >
                    Voltar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                    disabled={!finishMinutes || submitting}
                    onClick={() => handleSubmitFinishTime(alert)}
                  >
                    {submitting ? 'Enviando...' : 'Enviar resposta'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}