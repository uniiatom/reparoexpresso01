import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin, Phone, BellRing, KeyRound,
  Navigation, Wrench, CheckCircle2, ClipboardList, PlusCircle, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import ServiceChat from './ServiceChat';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

const clientIcon = L.divIcon({ html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #22c55e55;animation:ping 1s infinite;"></div>', className: '', iconAnchor: [8, 8] });
const providerIcon = L.divIcon({ html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>', className: '', iconAnchor: [7, 7] });

function RecenterOnChange({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng]);
  return null;
}

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

const STEPS = [
  { status: 'aceito',       label: 'Aceito',            icon: BellRing,     color: 'text-blue-600 bg-blue-100' },
  { status: 'a_caminho',    label: 'A caminho',         icon: Navigation,   color: 'text-orange-600 bg-orange-100' },
  { status: 'em_andamento', label: 'Em execução',       icon: Wrench,       color: 'text-primary bg-primary/10' },
  { status: 'concluido',    label: 'Concluído',         icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
];

// Toca beep de alerta urgente (três apitos curtos)
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + delay + 0.03);
      gain.gain.setValueAtTime(0.7, ctx.currentTime + delay + 0.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch (e) { /* silencia erro de áudio */ }
}

// Hook para alertar quando o prazo de chegada estimada está vencendo
function useArrivalAlert(job) {
  const alertedRef = useRef(false);

  useEffect(() => {
    // Só monitora quando está "a_caminho" e tem previsão de chegada
    if (job.status !== 'a_caminho' || !job.estimated_arrival_minutes || !job.updated_date) {
      alertedRef.current = false;
      return;
    }

    const checkAlert = () => {
      const startedAt = new Date(job.updated_date).getTime();
      const totalMs = job.estimated_arrival_minutes * 60 * 1000;
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = totalMs - elapsedMs;
      const remainingMin = remainingMs / 60000;

      // Alerta quando restar ≤ 2 minutos e ainda não alertou
      if (remainingMin <= 2 && remainingMin > 0 && !alertedRef.current) {
        alertedRef.current = true;
        playAlertBeep();
      }
      // Reseta se ainda tem tempo (caso o tempo estimado seja atualizado)
      if (remainingMin > 2) {
        alertedRef.current = false;
      }
    };

    checkAlert();
    const interval = setInterval(checkAlert, 30000); // verifica a cada 30s
    return () => clearInterval(interval);
  }, [job.status, job.estimated_arrival_minutes, job.updated_date]);
}

function calcDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Hook para enviar GPS do prestador em tempo real quando a_caminho
// Também recalcula estimated_arrival_minutes com base na distância atual até o cliente
function useProviderLocationBroadcast(job, active) {
  const watchRef = useRef(null);
  useEffect(() => {
    if (!active || !job?.id || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const clientLat = job.client_latitude || job.latitude;
        const clientLon = job.client_longitude || job.longitude;
        const distKm = calcDistance(pos.coords.latitude, pos.coords.longitude, clientLat, clientLon);
        const estimatedMinutes = distKm != null
          ? (distKm < 0.05 ? 1 : Math.max(1, Math.round((distKm / 30) * 60)))
          : null;

        const updateData = {
          provider_latitude: pos.coords.latitude,
          provider_longitude: pos.coords.longitude,
        };
        if (estimatedMinutes != null) updateData.estimated_arrival_minutes = estimatedMinutes;

        base44.entities.ServiceRequest.update(job.id, updateData);
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [job?.id, active]);
}

// Hook que calcula tempo de chegada local usando GPS atual (sem depender do valor no banco)
// Retorna: número de minutos, ou 0 se já chegou (<50m), ou null se sem dados
function useLocalArrivalMinutes(job, active) {
  const [localMinutes, setLocalMinutes] = useState(null);
  useEffect(() => {
    if (!active || !navigator.geolocation) { setLocalMinutes(null); return; }
    const clientLat = job.client_latitude || job.latitude;
    const clientLon = job.client_longitude || job.longitude;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Se não há coordenadas do cliente, calcula só com base no banco de estimated_arrival
        if (!clientLat || !clientLon) {
          // Sem coordenadas do cliente, não conseguimos calcular — usa valor do banco
          setLocalMinutes(null);
          return;
        }
        const distKm = calcDistance(pos.coords.latitude, pos.coords.longitude, clientLat, clientLon);
        if (distKm === null) { setLocalMinutes(null); return; }
        // < 50 metros = "chegando" = 1 min
        // < 200 metros = 1 min
        // Resto: velocidade média urbana 30km/h
        const mins = distKm < 0.2 ? 1 : Math.max(1, Math.round((distKm / 30) * 60));
        setLocalMinutes(mins);
      },
      () => setLocalMinutes(null),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [job?.id, active, job?.client_latitude, job?.latitude, job?.client_longitude, job?.longitude]);
  return localMinutes;
}

export default function ActiveJobCard({ job, providerName, onUpdateStatus, onShowChecklist, onShowAdditionalPoint, isPending }) {
  const [validationInput, setValidationInput] = useState('');

  // Transmite localização GPS e recalcula tempo de chegada em tempo real quando a_caminho
  useProviderLocationBroadcast(job, job.status === 'a_caminho');
  // Calcula tempo de chegada localmente via GPS (exibido no card sem depender do banco)
  const localArrivalMinutes = useLocalArrivalMinutes(job, ['aceito', 'a_caminho'].includes(job.status));
  // Alerta sonoro quando prazo de chegada está vencendo
  useArrivalAlert(job);

  const currentStepIndex = STEPS.findIndex(s => s.status === job.status);
  const currentStep = STEPS[currentStepIndex];
  const StepIcon = currentStep?.icon || BellRing;

  const handleNextStep = () => {
    const nextStep = STEPS[currentStepIndex + 1];
    if (!nextStep) return;
    onUpdateStatus({ id: job.id, status: nextStep.status });
    setValidationInput('');
  };

  // Botão de ação principal por etapa
  const renderActions = () => {
    if (job.status === 'aceito') {
      return (
        <Button
          className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold h-12"
          disabled={isPending}
          onClick={handleNextStep}
        >
          <Navigation className="w-4 h-4 mr-2" /> Iniciar Deslocamento
        </Button>
      );
    }

    if (job.status === 'a_caminho') {
      const needsValidation = !!job.validation_password;
      const validationOk = !needsValidation || validationInput === job.validation_password;

      return (
        <div className="space-y-3">
          {needsValidation && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
              <p className="text-xs text-blue-700 font-semibold mb-2 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /> Digite a senha informada pelo cliente
              </p>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={validationInput}
                onChange={e => setValidationInput(e.target.value.replace(/\D/g, ''))}
                className="rounded-xl text-center font-mono text-xl tracking-widest h-12"
              />
              {validationInput.length === 6 && !validationOk && (
                <p className="text-xs text-red-600 mt-1 text-center">Senha incorreta. Peça novamente ao cliente.</p>
              )}
            </div>
          )}
          <Button
            className="w-full rounded-2xl bg-primary text-primary-foreground font-bold h-12"
            disabled={!validationOk || isPending}
            onClick={handleNextStep}
          >
            <Wrench className="w-4 h-4 mr-2" /> Iniciar Execução
          </Button>
        </div>
      );
    }

    if (job.status === 'em_andamento') {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl border-primary text-primary"
              onClick={onShowChecklist}
            >
              <ClipboardList className="w-4 h-4 mr-1" /> Checklist
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
              disabled={isPending}
              onClick={handleNextStep}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-xl border-orange-400 text-orange-600 hover:bg-orange-50"
            onClick={onShowAdditionalPoint}
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Ponto adicional
          </Button>
          {job.additional_points?.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {job.additional_points.length} ponto(s) adicional(is) registrado(s)
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-primary/5 rounded-3xl p-5 border border-primary/20 mb-5 space-y-4">
      {/* Header status */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
          <BellRing className="w-3.5 h-3.5" /> Chamado ativo
        </p>
        {currentStep && (
          <span className={cn("text-xs font-bold px-2 py-1 rounded-xl flex items-center gap-1", currentStep.color)}>
            <StepIcon className="w-3.5 h-3.5" />
            {currentStep.label}
          </span>
        )}
      </div>

      {/* Barra de progresso das etapas */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => {
          const done = idx < currentStepIndex;
          const active = idx === currentStepIndex;
          const StIcon = step.icon;
          return (
            <React.Fragment key={step.status}>
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/20 text-primary ring-2 ring-primary" :
                "bg-muted text-muted-foreground"
              )}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StIcon className="w-3.5 h-3.5" />}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("flex-1 h-1 rounded-full", done ? "bg-primary" : "bg-muted")} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Informações do serviço */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="font-bold text-foreground text-lg">{SERVICE_LABELS[job.service_type] || job.service_type}</p>
          {job.service_number && (
            <span className="text-xs font-mono font-bold text-primary/70 bg-primary/10 px-2 py-0.5 rounded-lg">
              {job.service_number}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{job.description}</p>
        {job.problem_photos?.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {job.problem_photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-border" />
              </a>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {job.address}{job.city ? `, ${job.city}` : ''}
        </p>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          <Phone className="w-3.5 h-3.5" /> {job.client_name} · {job.client_phone}
        </p>

        {/* Tempo estimado de chegada — calculado localmente em tempo real */}
        {['aceito', 'a_caminho'].includes(job.status) && localArrivalMinutes != null && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <p className="text-sm font-bold text-orange-800">~{localArrivalMinutes} min até o cliente</p>
              <p className="text-xs text-orange-600">Calculado com base na sua localização atual</p>
            </div>
          </div>
        )}

        {/* Localização do cliente — disponível apenas a partir do deslocamento */}
        {['a_caminho', 'em_andamento', 'concluido'].includes(job.status) && (() => {
          const lat = job.client_latitude || job.latitude;
          const lng = job.client_longitude || job.longitude;
          if (!lat || !lng) return (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-2xl p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700 font-semibold">Localização do cliente não disponível ainda.</p>
            </div>
          );
          const isLive = !!(job.client_latitude && job.client_longitude);
          return (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border">
              <div className={cn("flex items-center gap-2 px-3 py-2 text-xs font-semibold", isLive ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700")}>
                {isLive
                  ? <><span className="w-2 h-2 rounded-full bg-green-500 animate-ping flex-shrink-0" /> 📡 Localização ao vivo do cliente</>
                  : <><MapPin className="w-3 h-3 flex-shrink-0" /> Localização do endereço</>
                }
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="ml-auto underline flex items-center gap-1">
                  Rota <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div style={{ height: 200 }}>
                <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[lat, lng]} icon={clientIcon}>
                    <Popup>Cliente</Popup>
                  </Marker>
                  {job.provider_latitude && job.provider_longitude && (
                    <Marker position={[job.provider_latitude, job.provider_longitude]} icon={providerIcon}>
                      <Popup>Você</Popup>
                    </Marker>
                  )}
                  {isLive && <RecenterOnChange lat={lat} lng={lng} />}
                </MapContainer>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Senha de identificação */}
      {job.security_password && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-amber-700 font-semibold">Sua senha de identificação</p>
          <p className="text-2xl font-mono font-black text-amber-900 tracking-widest mt-1">{job.security_password}</p>
          <p className="text-xs text-amber-600 mt-1">Mostre esta senha ao cliente antes de entrar</p>
        </div>
      )}

      {/* Chat */}
      <ServiceChat requestId={job.id} senderRole="prestador" senderName={providerName} />

      {/* Ações */}
      {renderActions()}
    </div>
  );
}