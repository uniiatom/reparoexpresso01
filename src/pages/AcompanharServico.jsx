import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, User, Phone, Star, MapPin, Wrench, AlertCircle, Plus } from "lucide-react";
import FavoriteButton from '../components/FavoriteButton';
import { cn } from "@/lib/utils";
import RatingModal from '../components/RatingModal';
import RetornoModal from '../components/RetornoModal';
import LocationTracker from '../components/LocationTracker';
import ServiceChat from '../components/ServiceChat';
import PaymentModal from '../components/PaymentModal';
import PixPaymentModal from '../components/PixPaymentModal';
import NotificationPermissionBanner from '../components/NotificationPermissionBanner';
import SatisfactionSurveyModal from '../components/SatisfactionSurveyModal';
import { useServiceNotifications } from '../hooks/useServiceNotifications';

const STATUS_STEPS = [
  { key: "aguardando", label: "Aguardando prestador", icon: Clock },
  { key: "aceito", label: "Prestador a caminho", icon: User },
  { key: "a_caminho", label: "Prestador a caminho", icon: User },
  { key: "em_andamento", label: "Serviço em execução", icon: Wrench },
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
  const [showRating, setShowRating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [showRetorno, setShowRetorno] = useState(false);
  const [showSatisfactionSurvey, setShowSatisfactionSurvey] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(null);
  const previousStatusRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const [allRequests, setAllRequests] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.ServiceRequest.filter({ created_by: user.email }, '-created_date', 50)
      .then(setAllRequests);
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.type === 'update') {
        setAllRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
      } else if (event.type === 'create' && event.data?.created_by === user.email) {
        setAllRequests(prev => [event.data, ...prev]);
      }
    });
    return unsub;
  }, [user?.email]);

  const handleRatingClose = () => {
    setShowRating(false);
    // Busca próximo serviço ativo (diferente do atual)
    const next = allRequests.find(r => r.id !== id && !['concluido', 'cancelado'].includes(r.status));
    if (next) {
      navigate(`/acompanhar/${next.id}`);
    } else {
      navigate('/');
    }
  };

  const [request, setRequest] = useState(null);

  useEffect(() => {
    if (!id) return;
    // Carga inicial
    base44.entities.ServiceRequest.filter({ id }).then(list => {
      if (list[0]) setRequest(list[0]);
    });
    // Atualização em tempo real
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.id === id) {
        if (event.type === 'update' || event.type === 'create') {
          setRequest(event.data);
        }
      }
    });
    return unsub;
  }, [id]);

  // Setup notifications for status changes
  useServiceNotifications(request, previousStatus);

  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Track status changes and play sound when provider accepts
  useEffect(() => {
    if (request?.status && request.status !== previousStatusRef.current) {
      const prev = previousStatusRef.current;
      previousStatusRef.current = request.status;
      setPreviousStatus(request.status);
      if (request.status === 'aceito' && (prev === 'aguardando' || prev === null)) {
        playNotificationSound();
      }
    }
  }, [request?.status]);

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

  // Mostrar pesquisa de satisfação após conclusão
  useEffect(() => {
    if (request?.status === 'concluido' && user?.id) {
      // Verifica se já respondeu pesquisa
      base44.entities.SatisfactionSurvey.filter({
        service_request_id: request.id,
        respondent_id: user.id,
        respondent_type: 'cliente'
      }).then(surveys => {
        if (surveys.length === 0) {
          const timer = setTimeout(() => setShowSatisfactionSurvey(true), 2000);
          return () => clearTimeout(timer);
        }
      });
    }
  }, [request?.status, user?.id, request?.id]);

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // OS do mesmo lote: criadas no mesmo dia pela mesma pessoa, exceto canceladas
  const batchRequests = allRequests.filter(r => {
    if (!request?.created_date) return false;
    const sameDay = r.created_date?.slice(0, 10) === request.created_date?.slice(0, 10);
    return sameDay && r.status !== 'cancelado';
  });
  const otherBatchRequests = batchRequests.filter(r => r.id !== id);

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === request.status);

  const statusColor = {
    aguardando: "text-yellow-600 bg-yellow-100",
    aceito: "text-blue-600 bg-blue-100",
    a_caminho: "text-orange-600 bg-orange-100",
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
          {request.status === 'a_caminho' && <span>🚗</span>}
          {request.status === 'concluido' && <CheckCircle2 className="w-4 h-4" />}
          {request.status === 'cancelado' && <AlertCircle className="w-4 h-4" />}
          {request.status === 'a_caminho' ? 'Prestador a caminho!' : STATUS_STEPS.find(s => s.key === request.status)?.label || request.status}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{SERVICE_LABELS[request.service_type] || request.service_type}</h1>
        {request.service_number && (
          <p className="text-xs font-mono font-bold text-primary/80 mt-1">Nº {request.service_number}</p>
        )}
        {request.modality === 'agendado' && request.scheduled_date && (
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-semibold">
            <span>📅</span>
            {new Date(request.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            {request.scheduled_time && <><span>·</span><span>🕐 {request.scheduled_time}</span></>}
          </div>
        )}
        <p className="text-muted-foreground text-sm mt-1 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> {request.address}
        </p>
      </div>

      {/* Painel de OS do mesmo lote */}
      {otherBatchRequests.length > 0 && (
        <div className="mb-5 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">
            📋 Outras OS do mesmo pedido ({otherBatchRequests.length + 1} no total)
          </p>
          {/* Card da OS atual resumido */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-3">
            {!request.security_password && request.status === 'aguardando' && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 rounded-xl border border-amber-200">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <p className="text-xs text-amber-700 font-semibold">Gerando senhas de segurança...</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-mono font-bold text-primary">{request.service_number || 'Esta OS'}</span>
                <p className="text-sm font-semibold text-foreground">{SERVICE_LABELS[request.service_type] || request.service_type}</p>
              </div>
              <span className={cn("text-xs font-bold px-2 py-1 rounded-xl", {
                'bg-yellow-100 text-yellow-700': request.status === 'aguardando',
                'bg-blue-100 text-blue-700': request.status === 'aceito',
                'bg-orange-100 text-orange-700': request.status === 'a_caminho',
                'bg-primary/10 text-primary': request.status === 'em_andamento',
                'bg-green-100 text-green-700': request.status === 'concluido',
              })}>
                {{ aguardando: 'Aguardando', aceito: 'Aceito', a_caminho: 'A caminho', em_andamento: 'Em execução', concluido: 'Concluído' }[request.status] || request.status}
              </span>
            </div>
            {request.security_password && (
              <div className="flex gap-2 mt-2">
                <div className="flex-1 bg-white rounded-xl p-2 border border-amber-100 text-center">
                  <p className="text-[10px] text-amber-700 font-semibold">Senha prestador</p>
                  <p className="text-lg font-mono font-black text-amber-900 tracking-widest">{request.security_password}</p>
                </div>
                <div className="flex-1 bg-white rounded-xl p-2 border border-amber-100 text-center">
                  <p className="text-[10px] text-amber-700 font-semibold">Sua senha</p>
                  <p className="text-lg font-mono font-black text-amber-900 tracking-widest">{request.validation_password}</p>
                </div>
              </div>
            )}
          </div>
          {/* Cards das outras OS */}
          {otherBatchRequests.map(r => (
            <button key={r.id} onClick={() => navigate(`/acompanhar/${r.id}`)}
              className="w-full text-left rounded-2xl border border-border bg-card p-3 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-mono font-bold text-muted-foreground">{r.service_number || r.id.slice(0,8)}</span>
                  <p className="text-sm font-semibold text-foreground">{SERVICE_LABELS[r.service_type] || r.service_type}</p>
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-xl", {
                  'bg-yellow-100 text-yellow-700': r.status === 'aguardando',
                  'bg-blue-100 text-blue-700': r.status === 'aceito',
                  'bg-orange-100 text-orange-700': r.status === 'a_caminho',
                  'bg-primary/10 text-primary': r.status === 'em_andamento',
                  'bg-green-100 text-green-700': r.status === 'concluido',
                })}>
                  {{ aguardando: 'Aguardando', aceito: 'Aceito', a_caminho: 'A caminho', em_andamento: 'Em execução', concluido: 'Concluído' }[r.status] || r.status}
                </span>
              </div>
              {r.security_password && (
                <div className="flex gap-2">
                  <div className="flex-1 bg-amber-50 rounded-xl p-2 border border-amber-100 text-center">
                    <p className="text-[10px] text-amber-700 font-semibold">Senha prestador</p>
                    <p className="text-lg font-mono font-black text-amber-900 tracking-widest">{r.security_password}</p>
                  </div>
                  <div className="flex-1 bg-amber-50 rounded-xl p-2 border border-amber-100 text-center">
                    <p className="text-[10px] text-amber-700 font-semibold">Sua senha</p>
                    <p className="text-lg font-mono font-black text-amber-900 tracking-widest">{r.validation_password}</p>
                  </div>
                </div>
              )}
              {r.provider_name && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <User className="w-3 h-3" /> {r.provider_name}
                </p>
              )}
              <p className="text-xs text-primary font-semibold mt-1">Toque para acompanhar →</p>
            </button>
          ))}
        </div>
      )}

      {/* Senhas de segurança — ocultar quando painel de lote já as exibe */}
      {!request.security_password && request.status === 'aguardando' && otherBatchRequests.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-5 flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{borderWidth: '3px'}} />
          <div>
            <p className="text-xs font-bold text-amber-800">🔐 Gerando senhas de segurança...</p>
            <p className="text-xs text-amber-600 mt-0.5">Aguarde alguns instantes</p>
          </div>
        </div>
      )}
      {request.security_password && otherBatchRequests.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-5 space-y-3">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">🔐 Senhas de segurança</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-3 border border-amber-100 text-center">
              <p className="text-xs text-amber-700 font-semibold mb-1">Senha do prestador</p>
              <p className="text-2xl font-mono font-black text-amber-900 tracking-widest">{request.security_password}</p>
              <p className="text-xs text-amber-600 mt-1">Peça ao prestador esta senha antes de autorizar a entrada</p>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-amber-100 text-center">
              <p className="text-xs text-amber-700 font-semibold mb-1">Sua senha de validação</p>
              <p className="text-2xl font-mono font-black text-amber-900 tracking-widest">{request.validation_password}</p>
              <p className="text-xs text-amber-600 mt-1">Informe ao prestador ao chegar</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {request.status !== 'cancelado' && (
        <div className="bg-card rounded-3xl p-5 border border-border mb-5">
          <div className="space-y-4">
            {["aguardando", "aceito", "a_caminho", "em_andamento", "concluido"].map((step) => {
              const statusOrder = ["aguardando", "aceito", "a_caminho", "em_andamento", "concluido"];
              const currentIdx = statusOrder.indexOf(request.status);
              const stepIdx = statusOrder.indexOf(step);
              const isCompleted = currentIdx >= stepIdx;
              const isCurrent = currentIdx === stepIdx;
              const labels = { aguardando: "Aguardando prestador", aceito: "Prestador confirmado", a_caminho: "Prestador a caminho", em_andamento: "Em execução", concluido: "Concluído" };
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all",
                    isCompleted ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? "✓" : <span className="text-xs">{stepIdx + 1}</span>}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    isCompleted ? "text-green-700 font-semibold" : "text-muted-foreground"
                  )}>
                    {labels[step]}
                    {isCurrent && !['concluido'].includes(step) && (
                      <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prestador a caminho - destaque */}
      {request.status === 'a_caminho' && (
        <div className="bg-orange-50 border border-orange-200 rounded-3xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🚗</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-orange-800 text-sm">Prestador a caminho!</p>
            <p className="text-xs text-orange-600">Acompanhe a localização em tempo real</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/rastreamento/${id}`)}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex-shrink-0"
          >
            📍 Ver
          </Button>
        </div>
      )}

      {/* Map Link para estados iniciais */}
      {['aguardando', 'aceito'].includes(request?.status) && (
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
            <div className="flex items-center gap-2">
              {request.provider_phone && (
                <a href={`https://wa.me/55${request.provider_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl">WhatsApp</Button>
                </a>
              )}
              {request.provider_id && (
                <FavoriteButton
                  providerId={request.provider_id}
                  providerName={request.provider_name}
                  providerData={{
                    name: request.provider_name,
                    photo_url: null,
                    rating: null,
                    city: request.city,
                    state: request.state,
                  }}
                  size="md"
                  variant="outline"
                />
              )}
            </div>
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
          {request.estimated_arrival_minutes != null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary font-bold px-4 py-2 rounded-2xl text-sm">
              🚗 Prestador a ~{request.estimated_arrival_minutes} min de você
            </div>
          )}
        </div>
      )}

      {/* Previsão de chegada quando aceito */}
      {request.status === 'aceito' && request.estimated_arrival_minutes != null && (
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl">🚗</div>
          <div>
            <p className="font-bold text-blue-800 text-sm">Prestador a ~{request.estimated_arrival_minutes} min de você</p>
            <p className="text-xs text-blue-600">Baseado na localização no momento da aceitação</p>
          </div>
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

      {['aguardando', 'aceito', 'a_caminho'].includes(request.status) && (() => {
        // Para serviços agendados, só permite cancelar até 30 min antes do horário
        if (request.modality === 'agendado' && request.scheduled_date && request.scheduled_time) {
          const scheduledDateTime = new Date(`${request.scheduled_date}T${request.scheduled_time}`);
          const minutesUntilStart = (scheduledDateTime - new Date()) / 60000;
          const canCancel = minutesUntilStart > 30;
          return (
            <div>
              <Button
                variant="outline"
                className="w-full rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => cancelRequest.mutate()}
                disabled={cancelRequest.isPending || !canCancel}
              >
                Cancelar agendamento
              </Button>
              {!canCancel && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  ⚠️ Cancelamentos só são permitidos até 30 minutos antes do horário agendado.
                </p>
              )}
            </div>
          );
        }

        // Para serviços imediatos com prestador a caminho, bloqueia se faltam ≤ 30 min para chegada
        if (['aceito', 'a_caminho'].includes(request.status) && request.estimated_arrival_minutes != null) {
          const canCancel = request.estimated_arrival_minutes > 30;
          return (
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => cancelRequest.mutate()}
                disabled={cancelRequest.isPending || !canCancel}
              >
                Cancelar atendimento
              </Button>
              {!canCancel && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  ⚠️ Cancelamento não permitido — o prestador chegará em menos de 30 minutos.
                </p>
              )}
            </div>
          );
        }

        // Serviço imediato ainda aguardando ou aceito sem previsão: cancela livremente
        return (
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => cancelRequest.mutate()}
              disabled={cancelRequest.isPending}
            >
              Cancelar pedido
            </Button>
          </div>
        );
      })()}

      {request.status === 'concluido' && (
        <div className="space-y-3">
          <Button 
            className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold h-11"
            onClick={() => setShowRetorno(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Solicitar Retorno
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
      {showRating && <RatingModal requestId={id} onClose={handleRatingClose} />}
      {showRetorno && <RetornoModal request={request} onClose={() => setShowRetorno(false)} />}
      {showSatisfactionSurvey && user && (
        <SatisfactionSurveyModal
          job={request}
          respondentType="cliente"
          respondentId={user.id}
          respondentName={user.full_name}
          onClose={() => setShowSatisfactionSurvey(false)}
        />
      )}
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
            onPaymentConfirmed={() => base44.entities.ServiceRequest.filter({ id }).then(list => { if (list[0]) setRequest(list[0]); })}
          />
        </>
      )}
    </div>
  );
}