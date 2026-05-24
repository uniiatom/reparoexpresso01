import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  listMyActiveServiceRequests,
  subscribeMyServiceRequests,
} from '@/lib/repositories/serviceRequestsRepository';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Wrench, Zap, Droplets, Paintbrush, Wind, Lock, Hammer, Settings, Star, Shield, Clock, Car, UserCheck, ClipboardList, BadgeCheck, Smartphone, Waves, Layers, HardHat, Thermometer, ChefHat, Truck, ShowerHead, Pipette, Gift, Heart, Store, Minimize2, Maximize2, Sparkles, DoorOpen, Phone, Gauge, ShieldAlert, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReferralCard from "@/components/ReferralCard";
import FavoritesList from "@/components/FavoritesList";
import PaymentModal from "@/components/PaymentModal";
import AvailableScheduleSelector from "@/components/AvailableScheduleSelector";
import FleetMap from "@/components/FleetMap";
import ServiceSearch from "@/components/ServiceSearch";
import OfferedServicesCatalog from '@/components/offered-services/OfferedServicesCatalog';
import AppLoadingScreen from '@/components/ui/AppLoadingScreen';
import { ROLES } from '@/lib/auth/roles';

const electricalServices = [
  { label: "Chuveiro", type: "eletrica_chuveiro", price: "R$ 80 - R$ 150" },
  { label: "Tomada", type: "eletrica_tomada", price: "R$ 60 - R$ 120" },
  { label: "Quadro de Distribuição", type: "eletrica_qdc", price: "R$ 100 - R$ 200" },
  { label: "Curto-circuito", type: "eletrica_curto", price: "R$ 120 - R$ 250" },
  { label: "Troca de Lâmpada", type: "eletrica_lampada", price: "R$ 40 - R$ 80" },
  { label: "Ventilador de Teto", type: "eletrica_ventilador_teto", price: "R$ 80 - R$ 180" },
];

const hydraulicServices = [
  { label: "Cano Furado", type: "hidraulica_cano_furado", price: "R$ 80 - R$ 200" },
  { label: "Registro de Gaveta ou Pressão", type: "hidraulica_registro", price: "R$ 60 - R$ 150" },
  { label: "Torneira", type: "hidraulica_torneira", price: "R$ 60 - R$ 150" },
  { label: "Reparo de Vaso Sanitário", type: "hidraulica_vaso", price: "R$ 80 - R$ 200" },
  { label: "Descarga", type: "hidraulica_descarga", price: "R$ 100 - R$ 250" },
];

const STATUS_LABEL = {
  aguardando: { label: 'Procurando prestador...', color: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
  aceito:     { label: 'Prestador confirmado', color: 'bg-sky-500/10 border-sky-500/30 text-sky-300', dot: 'bg-sky-400' },
  a_caminho:  { label: 'Prestador a caminho!', color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', dot: 'bg-orange-400' },
  em_andamento: { label: 'Em execução', color: 'bg-primary/10 border-primary/30 text-primary', dot: 'bg-primary' },
  em_espera:  { label: 'Em espera (peças)', color: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
  agendado:   { label: 'Agendado', color: 'bg-violet-500/10 border-violet-500/30 text-violet-300', dot: 'bg-violet-400' },
};

export default function Home() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [mainTab, setMainTab] = useState('cliente');
  const [serviceTab, setServiceTab] = useState('casa');
  const [showElectricalModal, setShowElectricalModal] = useState(false);
  const [selectedElectricalService, setSelectedElectricalService] = useState(null);
  const [showHydraulicModal, setShowHydraulicModal] = useState(false);
  const [selectedHydraulicService, setSelectedHydraulicService] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleType, setScheduleType] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingServiceData, setPendingServiceData] = useState(null);
  const [showNearbyMap, setShowNearbyMap] = useState(false);
  const [electricalModalExpanded, setElectricalModalExpanded] = useState(true);
  const [hydraulicModalExpanded, setHydraulicModalExpanded] = useState(true);
  const [activeRequests, setActiveRequests] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setActiveRequests([]);
      return;
    }
    let cleanup = () => {};
    (async () => {
      try {
        const list = await listMyActiveServiceRequests();
        setActiveRequests(list);
      } catch {
        setActiveRequests([]);
      }
      cleanup = await subscribeMyServiceRequests((payload) => {
        const row = payload.new || payload.old;
        if (!row) return;
        if (payload.eventType === 'DELETE') {
          setActiveRequests((prev) => prev.filter((r) => r.id !== row.id));
          return;
        }
        if (['concluido', 'cancelado'].includes(row.status)) {
          setActiveRequests((prev) => prev.filter((r) => r.id !== row.id));
          return;
        }
        setActiveRequests((prev) => {
          const i = prev.findIndex((r) => r.id === row.id);
          if (i >= 0) {
            const next = [...prev];
            next[i] = row;
            return next;
          }
          return [...prev, row];
        });
      });
    })();
    return () => cleanup();
  }, [user?.id]);

  const { data: pricingList = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: async () => {
      try {
        return await base44.entities.ServicePricing.list();
      } catch {
        return [];
      }
    },
  });

  const getPriceLabel = (serviceType) => {
    const p = pricingList.find(x => x.service_type === serviceType);
    if (!p || p.price_min == null) return null;
    return `R$ ${p.price_min} - R$ ${p.price_max}`;
  };

  useEffect(() => {
    if (user?.role === ROLES.PROVIDER || user?.role === 'prestador') {
      setMainTab('prestador');
    } else if (user?.role === ROLES.PARTNER) {
      setMainTab('parceiro');
    } else if (user?.role !== ROLES.ADMIN && user?.role !== ROLES.ATTENDANT) {
      setMainTab('cliente');
    }
  }, [user?.role]);

  // Admin e atendente não devem ver a área do cliente — redireciona para o painel
  if (isLoadingAuth) {
    return <AppLoadingScreen fullScreen={false} className="min-h-screen" />;
  }

  if (user?.role === ROLES.ADMIN || user?.role === ROLES.ATTENDANT) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background"
    >
          {/* Main tabs card — full screen */}
          <div className="w-full px-3 sm:px-6 lg:px-10 pt-4">
            <div className="bg-card rounded-xl shadow-2xl overflow-hidden ring-1 ring-border circuit-bg">
              <div className="flex border-b border-border overflow-x-auto">
                 {(user?.role === ROLES.USER || !user) && (
                   <button
                     onClick={() => setMainTab('cliente')}
                     className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'cliente' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                   >
                     👤 Cliente
                   </button>
                 )}
                 {(user?.role === ROLES.PROVIDER || user?.role === 'prestador' || !user) && (
                   <button
                     onClick={() => setMainTab('prestador')}
                     className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'prestador' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                   >
                     🔧 Prestador
                   </button>
                 )}
                 {(user?.role === ROLES.PARTNER || !user) && (
                   <button
                     onClick={() => setMainTab('parceiro')}
                     className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'parceiro' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                   >
                     🏪 Parceiro
                   </button>
                 )}
                 {user?.role === ROLES.USER && (
                   <>
                     <button
                       onClick={() => setMainTab('favoritos')}
                       className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'favoritos' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                     >
                       ❤️ Favoritos
                     </button>
                     <button
                       onClick={() => setMainTab('promocao')}
                       className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'promocao' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                     >
                       🎁 Ganhe
                     </button>
                   </>
                 )}
               </div>

              <div className="p-6 pt-8">
                 {/* ── CLIENTE ── */}
                 {mainTab === 'cliente' && (
                   <motion.div key="cliente" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                     {/* Banner de OS ativas */}
                     {activeRequests.length > 0 && (
                       <div className="mb-5 space-y-2">
                         {activeRequests.map(req => {
                           const s = STATUS_LABEL[req.status] || STATUS_LABEL['aguardando'];
                           return (
                             <button
                               key={req.id}
                               onClick={() => navigate(`/acompanhar/${req.id}`)}
                               className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition-all hover:opacity-90 ${s.color}`}
                             >
                               <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse ${s.dot}`} />
                               <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold">{s.label}</p>
                                 {req.estimated_arrival_minutes != null && ['aceito','a_caminho'].includes(req.status) && (
                                   <p className="text-xs font-semibold mt-0.5">🚗 Prestador chega em ~{req.estimated_arrival_minutes} min</p>
                                 )}
                                 {req.provider_name && (
                                   <p className="text-xs opacity-80 truncate">{req.provider_name}</p>
                                 )}
                               </div>
                               <span className="text-xs font-semibold opacity-70 flex-shrink-0">Ver →</span>
                             </button>
                           );
                         })}
                       </div>
                     )}

                     <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setServiceTab('casa')}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${serviceTab === 'casa' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        🏠 Casa
                      </button>
                      <button
                        onClick={() => setServiceTab('veiculo')}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${serviceTab === 'veiculo' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        🚗 Veículo
                      </button>
                     </div>

                     {serviceTab === 'veiculo' && (
                       <p className="text-xs text-muted-foreground mb-4">
                         Atendimento emergencial para veículos — prestadores homologados pela Escola Prática
                       </p>
                     )}

                     <OfferedServicesCatalog
                       variant="cards"
                       group={serviceTab}
                       hideGroupTabs
                       hideHeader
                       onServiceClick={(service) => navigate(`/solicitar?tipo=${encodeURIComponent(service.slug)}`)}
                     />
                   </motion.div>
                 )}

                 {/* ── FAVORITOS ── */}
                {mainTab === 'favoritos' && user && (
                  <motion.div key="favoritos" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <FavoritesList />
                  </motion.div>
                )}

                {/* ── PROMOÇÃO ── */}
                {mainTab === 'promocao' && user && (
                  <motion.div key="promocao" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <ReferralCard user={user} />
                  </motion.div>
                )}

                {/* ── PARCEIRO ── */}
                {mainTab === 'parceiro' && (
                  <motion.div key="parceiro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center mb-2">
                      Seja um parceiro lojista ou vendedor e aumente seus ganhos
                    </p>
                    <div className="space-y-3">
                      {[
                        { icon: Store, title: "Lojista", desc: "Gerencie sua loja e aumente vendas" },
                        { icon: Smartphone, title: "Vendedor", desc: "Venda produtos direto pela plataforma" },
                        { icon: BadgeCheck, title: "Credibilidade", desc: "Construa sua reputação na rede" },
                        { icon: Star, title: "Comissões", desc: "Ganhe comissões competitivas" },
                      ].map(item => (
                        <div key={item.title} className="flex items-start gap-3 p-3 bg-secondary/50 border border-border rounded-xl hover:border-primary/20 transition-colors">
                          <div className="w-9 h-9 bg-primary/15 border border-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                      <Link to="/cadastro-parceiro">
                        <Button className="w-full h-12 rounded-2xl font-bold text-sm">
                          <Store className="w-4 h-4 mr-2" /> Cadastrar como Parceiro
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* ── PRESTADOR ── */}
                {mainTab === 'prestador' && (
                  <motion.div key="prestador" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center mb-2">
                      Faça parte da nossa rede de profissionais homologados pela <span className="font-semibold text-foreground">Escola Prática</span>
                    </p>
                    <div className="space-y-3">
                      {[
                        { icon: Smartphone, title: "App para prestadores", desc: "Receba alertas sonoros de novos chamados no celular" },
                        { icon: ClipboardList, title: "Aceite ou recuse", desc: "Você decide quais chamados atender" },
                        { icon: BadgeCheck, title: "Homologação gratuita", desc: "Certificação pela Escola Prática inclusa" },
                        { icon: Star, title: "Construa reputação", desc: "Avaliações que aumentam seus ganhos" },
                      ].map(item => (
                        <div key={item.title} className="flex items-start gap-3 p-3 bg-secondary/50 border border-border rounded-xl hover:border-primary/20 transition-colors">
                          <div className="w-9 h-9 bg-primary/15 border border-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                      <Link to="/prestador">
                        <Button className="w-full h-12 rounded-2xl font-bold text-sm">
                          <UserCheck className="w-4 h-4 mr-2" /> Já sou cadastrado — Entrar
                        </Button>
                      </Link>
                      <Link to="/cadastro-prestador">
                        <Button variant="outline" className="w-full h-12 rounded-2xl font-bold text-sm">
                          Quero me cadastrar como prestador
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Fleet Map */}
          {showNearbyMap && <FleetMap onClose={() => setShowNearbyMap(false)} />}

          {/* Payment Modal */}
          {showPaymentModal && pendingServiceData && (
            <PaymentModal
              isOpen={showPaymentModal}
              onClose={() => setShowPaymentModal(false)}
              serviceData={pendingServiceData}
            />
          )}

          {/* Nearby Providers Map Button */}
          <div className="w-full px-3 sm:px-6 lg:px-10 mt-4">
            <button
              onClick={() => setShowNearbyMap(true)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 hover:bg-accent transition-all shadow-sm"
            >
              <span className="text-2xl">🗺️</span>
              <div className="text-left flex-1">
                <p className="font-bold text-foreground text-sm">🚐 Frota ao Vivo — Fiorino • Reboque • Moto</p>
                <p className="text-xs text-muted-foreground">Acompanhe a frota em tempo real no mapa</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Ao vivo
              </span>
            </button>
          </div>

          {/* Trust */}
          <div className="w-full px-3 sm:px-6 lg:px-10 mt-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3 pb-10">
            {[
              { icon: Shield, title: "Homologados", desc: "Certificados pela Escola Prática" },
              { icon: Clock, title: "Rápido", desc: "Previsão de chegada em tempo real" },
              { icon: Star, title: "Avaliados", desc: "Veja notas reais de clientes" },
            ].map(item => (
              <div key={item.title} className="bg-card rounded-xl p-4 text-center border border-border hover:border-primary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-bold text-foreground font-display tracking-wider uppercase">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{item.desc}</p>
              </div>
            ))}
          </div>
    </motion.div>
  );
}
