import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, User, Phone, Star, MapPin, Wrench, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import RatingModal from '../components/RatingModal';
import LocationTracker from '../components/LocationTracker';
import ServiceChat from '../components/ServiceChat';
import PaymentModal from '../components/PaymentModal';
import PixPaymentModal from '../components/PixPaymentModal';
import NotificationPermissionBanner from '../components/NotificationPermissionBanner';
import { useServiceNotifications } from '../hooks/useServiceNotifications';

const STATUS_STEPS = [
  { key: "aguardando", label: "Aguardando prestador", icon: Clock },
  { key: "aceito", label: "Prestador a caminho", icon: User },
  { key: "a_caminho", label: "Prestador a caminho", icon: User },
  { key: "em_andamento", label: "Serviço em andamento", icon: Wrench },
  { key: "concluido", label: "Serviço concluído!", icon: CheckCircle2 },
];

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

export default function AcompanharServico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(null);

  // Setup notifications for status changes
  useServiceNotifications(request, previousStatus);

  // Track status changes and play sound when provider accepts
  useEffect(() => {
    if (request?.status && request.status !== previousStatus) {
      setPreviousStatus(request.status);
      
      // Play sound when provider is assigned
      if (request.status === 'aceito' && previousStatus === 'aguardando') {
        playNotificationSound();
      }
    }
  const { data: request } = useQuery({
    queryKey: ['service-request', id],
    queryFn: async () => {
      const list = await base44.entities.ServiceRequest.filter({ id });
      return list[0];
    },
    refetchInterval: 5000,
    enabled: !!id,
  });

  const cancelRequest = useMutation({
    mutationFn: () => base44.entities.ServiceRequest.update(id, { status: 'cancelado' }),
    onSuccess: () => navigate('/'),
  });

  useEffect(() => {
    if (request?.status === 'concluido' && !request?.rating_client) {
      // Delay modal appearance slightly to ensure smooth UX
      const timer = setTimeout(() => setShowRating(true), 500);
      return () => clearTimeout(timer);
    }
  }, [request?.status, request?.rating_client]);

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === request.status);

  const statusColor = {
    aguardando: "text-yellow-600 bg-yellow-100",
    aceito: "text-blue-600 bg-blue-100",
    a_caminho: "text-blue-600 bg-blue-100",
    em_andamento: "text-primary bg-primary/10",
    concluido: "text-green-600 bg-green-100",
    cancelado: "text-red-600 bg-red-100",
  }[request.status] || "text-muted-foreground bg-muted";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      <NotificationPermissionBanner />
      {/* Header */}
      <div className="text-center mb-8">
        <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-3", statusColor)}>
          {request.status === 'aguardando' && <Clock className="w-4 h-4 animate-pulse" />}
          {request.status === 'concluido' && <CheckCircle2 className="w-4 h-4" />}
          {request.status === 'cancelado' && <AlertCircle className="w-4 h-4" />}
          {STATUS_STEPS.find(s => s.key === request.status)?.label || request.status}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{SERVICE_LABELS[request.service_type] || request.service_type}</h1>
        <p className="text-muted-foreground text-sm mt-1 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> {request.address}
        </p>
      </div>

      {/* Progress */}
      {request.status !== 'cancelado' && (
        <div className="bg-card rounded-3xl p-5 border border-border mb-5">
          <div className="space-y-4">
            {["aguardando", "aceito", "em_andamento", "concluido"].map((step, i) => {
              const isCompleted = currentStepIndex > i;
              const isCurrent = STATUS_STEPS[currentStepIndex]?.key === step || (step === "aceito" && request.status === "a_caminho");
              const labels = { aguardando: "Aguardando prestador", aceito: "Prestador confirmado", em_andamento: "Em andamento", concluido: "Concluído" };
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all",
                    isCompleted ? "bg-primary text-primary-foreground" :
                    isCurrent ? "bg-primary/20 text-primary ring-2 ring-primary animate-pulse" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? "✓" : i + 1}
                  </div>
                  <span className={cn("text-sm font-medium", isCurrent ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground")}>
                    {labels[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Map Link */}
      {['aguardando', 'aceito', 'a_caminho'].includes(request?.status) && (
        <Button
          onClick={() => navigate(`/mapa/${id}`)}
          variant="outline"
          className="w-full rounded-2xl h-11 mb-5 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
        >
          🗺️ Ver Mapa de Localização
        </Button>
      )}

      {/* Prestador info */}
      {request.provider_name && (
        <div className="bg-card rounded-3xl p-5 border border-border mb-5">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-semibold">Seu prestador</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{request.provider_name.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">{request.provider_name}</p>
              {request.provider_phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {request.provider_phone}
                </p>
              )}
            </div>
            {request.provider_phone && (
              <a href={`https://wa.me/55${request.provider_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="rounded-xl">WhatsApp</Button>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Aguardando animation */}
      {request.status === 'aguardando' && (
        <div className="bg-primary/5 rounded-3xl p-6 text-center border border-primary/20 mb-5">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Wrench className="w-7 h-7 text-primary" />
            </div>
          </div>
          <p className="font-semibold text-foreground">Procurando prestadores próximos...</p>
          <p className="text-sm text-muted-foreground mt-1">Normalmente leva menos de 5 minutos</p>
        </div>
      )}

      {/* Chat */}
      {['aceito','a_caminho','em_andamento','concluido'].includes(request.status) && (
        <ServiceChat
          requestId={id}
          senderRole="cliente"
          senderName={request.client_name}
        />
      )}

      {/* Preço final */}
      {request.final_price && (
        <div className="bg-card rounded-3xl p-5 border border-border mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Valor do serviço</span>
            <span className="text-2xl font-bold text-primary">R$ {request.final_price.toFixed(2)}</span>
          </div>
          {/* Payment Status */}
          {request.payment_status && (
            <div className={cn(
              "text-sm p-3 rounded-xl text-center font-semibold",
              request.payment_status === 'paid'
                ? 'bg-green-100 text-green-700'
                : request.payment_status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            )}>
              {request.payment_status === 'paid' && '✓ Pagamento confirmado'}
              {request.payment_status === 'pending' && '⏳ Aguardando pagamento'}
              {request.payment_status === 'expired' && '✕ Sessão de pagamento expirada'}
            </div>
          )}
          {request.status === 'concluido' && request.payment_status !== 'paid' && (
           <div className="space-y-2">
             <Button
               onClick={() => setShowPixPayment(true)}
               className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold h-11"
             >
               🔐 PIX
             </Button>
             <Button
               onClick={() => setShowPayment(true)}
               variant="outline"
               className="w-full rounded-2xl font-semibold h-11"
             >
               💳 Cartão de Crédito
             </Button>
           </div>
          )}
        </div>
      )}

      {/* Avaliação */}
      {request.status === 'concluido' && request.rating_client && (
        <div className="bg-card rounded-3xl p-5 border border-border mb-5 text-center">
          <div className="flex justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={cn("w-6 h-6", s <= request.rating_client ? "text-yellow-400 fill-yellow-400" : "text-muted")} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Obrigado pela avaliação!</p>
        </div>
      )}

      {request.status === 'aguardando' && (
        <Button
          variant="outline"
          className="w-full rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => cancelRequest.mutate()}
          disabled={cancelRequest.isPending}
        >
          Cancelar pedido
        </Button>
      )}

      {request.status === 'concluido' && (
        <div className="space-y-3">
          <Button 
            className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold h-11"
            onClick={() => navigate(`/solicitar?tipo=${request.service_type}`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Abrir Retorno
          </Button>
          <Button 
            variant="outline"
            className="w-full rounded-2xl"
            onClick={() => navigate('/')}
          >
            Voltar ao início
          </Button>
        </div>
      )}

      <LocationTracker
        requestId={id}
        active={['aguardando','aceito','a_caminho','em_andamento'].includes(request?.status)}
      />
      {showRating && <RatingModal requestId={id} onClose={() => setShowRating(false)} />}
      {request.final_price && (
        <>
          <PaymentModal
            isOpen={showPayment}
            onClose={() => setShowPayment(false)}
            requestId={id}
            finalPrice={request.final_price}
            serviceName={SERVICE_LABELS[request.service_type] || request.service_type}
          />
          <PixPaymentModal
            isOpen={showPixPayment}
            onClose={() => setShowPixPayment(false)}
            requestId={id}
            finalPrice={request.final_price}
            serviceName={SERVICE_LABELS[request.service_type] || request.service_type}
            onPaymentConfirmed={() => queryClient.invalidateQueries({ queryKey: ['service-request', id] })}
          />
        </>
      )}
    </div>
  );
}