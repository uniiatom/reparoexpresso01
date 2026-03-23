import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin, Phone, BellRing, KeyRound,
  Navigation, Wrench, CheckCircle2, ClipboardList, PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import ServiceChat from './ServiceChat';

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

// Hook para enviar GPS do prestador em tempo real quando a_caminho
function useProviderLocationBroadcast(jobId, active) {
  const watchRef = useRef(null);
  useEffect(() => {
    if (!active || !jobId || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        base44.entities.ServiceRequest.update(jobId, {
          provider_latitude: pos.coords.latitude,
          provider_longitude: pos.coords.longitude,
        });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [jobId, active]);
}

export default function ActiveJobCard({ job, providerName, onUpdateStatus, onShowChecklist, onShowAdditionalPoint, isPending }) {
  const [validationInput, setValidationInput] = useState('');

  // Transmite localização GPS apenas quando a_caminho
  useProviderLocationBroadcast(job.id, job.status === 'a_caminho');

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