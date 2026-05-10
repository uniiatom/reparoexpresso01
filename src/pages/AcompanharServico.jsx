import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import WarrantyBadge from '../components/WarrantyBadge';

import BatchProvidersPanel from '../components/BatchProvidersPanel';
import BatchProviderChat from '../components/BatchProviderChat';
import ClientTicketForm from '../components/ClientTicketForm';
import CouponInput from '../components/CouponInput';
import ProviderExtraChargesPanel from '../components/ProviderExtraChargesPanel';
import ServicePriceHistoryPanel from '../components/ServicePriceHistoryPanel';
import useClientNotifications from '../hooks/useClientNotifications';

const STATUS_STEPS = [
  { key: "aguardando", label: "Aguardando prestador", icon: Clock },
  { key: "aceito", label: "Prestador confirmado", icon: User },
  { key: "a_caminho", label: "Prestador a caminho!", icon: User },
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
  const urlParams = new URLSearchParams(window.location.search);
  const [showRating, setShowRating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [showRetorno, setShowRetorno] = useState(urlParams.get('retorno') === '1');
  const [showSatisfactionSurvey, setShowSatisfactionSurvey] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(null);
  const previousStatusRef = useRef(null);
  const [user, setUser] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [providerPhotos, setProviderPhotos] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Monitora notificações de orçamento extra em tempo real
  useClientNotifications(user?.email);

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
      if (list[0]) {
        setRequest(list[0]);
      } else {
        navigate('/');
      }
    }).catch(() => navigate('/'));
    
    // Atualização em tempo real
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.id === id) {
        if (event.type === 'update' || event.type === 'create') {
          setRequest(event.data);
        }
      }
    });
    return unsub;
  }, [id, navigate]);

  // Busca fotos dos prestadores envolvidos
  useEffect(() => {
    if (!request?.provider_id && allRequests.length === 0) return;
    const ids = [...new Set(
      allRequests
        .filter(r => r.provider_id)
        .map(r => r.provider_id)
        .concat(request?.provider_id ? [request.provider_id] : [])
    )];
    ids.forEach(pid => {
      if (providerPhotos[pid] !== undefined) return;
      base44.entities.Provider.filter({ id: pid }).then(list => {
        if (list[0]) setProviderPhotos(prev => ({ ...prev, [pid]: list[0].photo_url || null }));
      }).catch(() => {});
    });
  }, [request?.provider_id, allRequests.length]);



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
    if (!request?.status) return;
    if (previousStatusRef.current === null) {
      // Primeira carga: inicializa sem tocar som
      previousStatusRef.current = request.status;
      setPreviousStatus(request.status);
      return;
    }
    if (request.status !== previousStatusRef.current) {
      const prev = previousStatusRef.current;
      previousStatusRef.current = request.status;
      setPreviousStatus(request.status);
      if (request.status === 'aceito' && prev === 'aguardando') {
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

  if (!id) {
    navigate('/');
    return null;
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // OS do mesmo lote: criadas com menos de 5 minutos de diferença pela mesma pessoa, exceto canceladas
  const batchRequests = allRequests.filter(r => {
    if (!request?.created_date) return false;
    const diffMs = Math.abs(new Date(r.created_date) - new Date(request.created_date));
    const diffMin = diffMs / 60000;
    return diffMin <= 5 && r.status !== 'cancelado';
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
      <div className="text-center mb-6">
        {/* Quick Access Button */}
        <div className="flex justify-center mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/garantia')}
            className="rounded-full text-xs border-primary/30 text-primary hover:bg-primary/10"
          >
            🛡️ Minha Garantia
          </Button>
        </div>

        <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-3", statusColor)}>
          {request.status === 'aguardando' && <Clock className="w-4 h-4 animate-pulse" />}
          {request.status === 'a_caminho' && <span>🚗</span>}
          {request.status === 'concluido' && <CheckCircle2 className="w-4 h-4" />}
          {request.status === 'cancelado' && <AlertCircle className="w-4 h-4" />}
          {STATUS_STEPS.find(s => s.key === request.status)?.label || request.status}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{SERVICE_LABELS[request.service_type] || request.service_type}</h1>
        {request.service_number && (
          <p className="text-xs font-mono font-bold text-primary/80 mt-1">Nº {request.service_number}</p>
        )}
        {request.provider_name && otherBatchRequests.length > 0 && (
          <p className="text-sm font-semibold text-primary mt-1">🔧 {request.provider_name}</p>
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

      {/* Painel de múltiplos prestadores */}
      <BatchProvidersPanel batchRequests={batchRequests} currentId={id} />

      {/* Chat entre prestadores do lote — visível para o cliente acompanhar */}
      {batchRequests.length >= 2 && (
        <BatchProviderChat
          batchRequests={batchRequests}
          senderRole="cliente"
          senderName={request.client_name}
        />
      )}

      {/* Senhas de segurança — mostra para todas as OS do lote */}
      {batchRequests.every(r => !r.security_password) && request.status === 'aguardando' && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-5 flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{borderWidth: '3px'}} />
          <div>
            <p className="text-xs font-bold text-amber-800">🔐 Gerando senhas de segurança...</p>
            <p className="text-xs text-amber-600 mt-0.5">Aguarde alguns instantes</p>
          </div>
        </div>
      )}
      {batchRequests.some(r => r.security_password) && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 mb-5 space-y-3">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">🔐 Senhas de segurança</p>
          {batchRequests.filter(r => r.security_password).map((r, idx) => (
            <div key={r.id} className="space-y-2">
              {batchRequests.filter(x => x.security_password).length > 1 && (
                <p className="text-xs font-semibold text-amber-700">Prestador {idx + 1}{r.provider_name ? ` — ${r.provider_name}` : ''}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-3 border border-amber-100 text-center">
                  <p className="text-xs text-amber-700 font-semibold mb-1">Senha do prestador</p>
                  <p className="text-2xl font-mono font-black text-amber-900 tracking-widest">{r.security_password}</p>
                  <p className="text-xs text-amber-600 mt-1">Peça ao prestador esta senha antes de autorizar a entrada</p>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-amber-100 text-center">
                  <p className="text-xs text-amber-700 font-semibold mb-1">Sua senha de validação</p>
                  <p className="text-2xl font-mono font-black text-amber-900 tracking-widest">{r.validation_password}</p>
                  <p className="text-xs text-amber-600 mt-1">Informe ao prestador ao chegar</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badge de Garantia */}
      {request.status === 'concluido' && (
        <WarrantyBadge request={request} />
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
      {['aguardando', 'aceito', 'a_caminho'].includes(request?.status) && (
        <Button
          onClick={() => navigate(`/mapa/${id}`)}
          variant="outline"
          className="w-full rounded-2xl h-11 mb-5 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
        >
          🗺️ Ver Mapa de Localização
        </Button>
      )}

      {/* Prestador(es) info */}
      {(() => {
        const providers = batchRequests.length >= 2
          ? batchRequests.filter(r => r.provider_name)
          : request.provider_name ? [request] : [];
        if (providers.length === 0) return null;
        return (
          <div className="bg-card rounded-3xl p-5 border border-border mb-5">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-semibold">
              {providers.length > 1 ? `Seus prestadores (${providers.length})` : 'Seu prestador'}
            </p>
            <div className="space-y-4">
              {providers.map((r, idx) => (
                <div key={r.id} className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.provider_id && providerPhotos[r.provider_id]
                      ? <img src={providerPhotos[r.provider_id]} alt={r.provider_name} className="w-full h-full object-cover" />
                      : <span className="text-2xl font-bold text-primary">{r.provider_name.charAt(0)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{r.provider_name}</p>
                    {providers.length > 1 && (
                      <p className="text-xs text-primary font-semibold">Prestador {idx + 1}</p>
                    )}
                    {r.provider_phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {r.provider_phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.provider_phone && (
                      <a href={`https://wa.me/55${r.provider_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="rounded-xl">WhatsApp</Button>
                      </a>
                    )}
                    {r.provider_id && (
                      <FavoriteButton
                        providerId={r.provider_id}
                        providerName={r.provider_name}
                        providerData={{ name: r.provider_name, photo_url: null, rating: null, city: r.city, state: r.state }}
                        size="md"
                        variant="outline"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Falar com atendente */}
      <ClientTicketForm 
        clientId={request.client_id}
        clientName={request.client_name}
        clientEmail={user?.email || request.created_by}
      />

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

      {/* Histórico de valores */}
      <ServicePriceHistoryPanel serviceId={id} />

      {/* Painel do prestador para criar orçamento extra (durante execução) */}
      {user?.role === 'admin' && request.status === 'em_andamento' && (
        <ProviderExtraChargesPanel 
          service={request}
          onApprovalChange={() => {
            base44.entities.ServiceRequest.get(id).then(setRequest);
          }}
        />
      )}

      {/* Chat */}
      {['aceito','a_caminho','em_andamento','concluido'].includes(request.status) && (
        <ServiceChat
          requestId={id}
          senderRole="cliente"
          senderName={request.client_name}
        />
      )}

      {/* Preço estimado ou final */}
      {(request.final_price || request.estimated_price || request.client_suggested_price) && (
        <div className="bg-card rounded-3xl p-5 border border-border mb-5 space-y-4">
          {/* Cupom de desconto */}
          <CouponInput
            serviceAmount={request.final_price || request.estimated_price || request.client_suggested_price}
            serviceType={request.service_type}
            providerId={request.provider_id}
            onCouponApplied={(coupon) => setAppliedCoupon(coupon)}
            onCouponRemoved={() => setAppliedCoupon(null)}
          />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {request.final_price ? 'Valor do serviço' : 'Valor estimado'}
            </span>
            <span className="text-2xl font-bold text-primary">
              R$ {(request.final_price || request.estimated_price || request.client_suggested_price)?.toFixed(2)}
            </span>
          </div>

          {/* Desconto aplicado */}
          {appliedCoupon && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-800 font-semibold">Desconto:</span>
                <span className="text-green-800 font-bold">-R$ {appliedCoupon.discount_amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold border-t border-green-200 pt-2">
                <span className="text-green-800">Total:</span>
                <span className="text-green-700">R$ {appliedCoupon.final_amount.toFixed(2)}</span>
              </div>
            </div>
          )}
          {request.estimated_price && !request.final_price && (
            <p className="text-xs text-muted-foreground text-center">
              ℹ️ Este é um valor estimado. O valor final será confirmado após o atendimento.
            </p>
          )}
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

      {request.status === 'em_espera' && (() => {
        // Mostra prazo de 15 dias para retorno por peça
        const createdAt = request.created_date ? new Date(request.created_date) : null;
        const daysLeft = createdAt ? Math.ceil((createdAt.getTime() + 15 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)) : null;
        const isPastDeadline = daysLeft != null && daysLeft <= 0;

        return (
          <div className={`rounded-3xl p-5 border-2 mb-5 ${isPastDeadline ? 'bg-red-50 border-red-300' : daysLeft <= 3 ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{isPastDeadline ? '❌' : '⏰'}</span>
              <div className="flex-1">
                <p className={`font-bold ${isPastDeadline ? 'text-red-800' : daysLeft <= 3 ? 'text-amber-800' : 'text-blue-800'}`}>
                  {isPastDeadline ? 'Prazo expirado' : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
                </p>
                <p className={`text-xs mt-1 ${isPastDeadline ? 'text-red-700' : daysLeft <= 3 ? 'text-amber-700' : 'text-blue-700'}`}>
                  Cliente tem até 15 dias corridos para comprar a peça e solicitar retorno
                </p>
              </div>
            </div>
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