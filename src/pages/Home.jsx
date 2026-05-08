import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
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

const homeServices = [
  { icon: Zap, label: "Elétrica", subtitle: "Chuveiro, tomada, QDC", type: "eletrica", color: "bg-amber-500/15 text-amber-400" },
  { icon: Pipette, label: "Hidráulica", subtitle: "Vazamento, registro", type: "hidraulica", color: "bg-sky-500/15 text-sky-400" },
  { icon: Lock, label: "Fechadura", subtitle: "Serviços de fechadura", type: "fechadura", color: "bg-emerald-500/15 text-emerald-400" },
  { icon: Thermometer, label: "Ar Condicionado", subtitle: "Instalação e reparo", type: "ar_condicionado", color: "bg-cyan-500/15 text-cyan-400" },
  { icon: Waves, label: "Limpeza Caixa d'Água", subtitle: "Limpeza especializada", type: "limpeza_caixa_dagua", color: "bg-sky-500/15 text-sky-400" },
  { icon: Droplets, label: "Limpeza de Calha", subtitle: "Desobstrução", type: "limpeza_calha", color: "bg-slate-500/15 text-slate-400" },
  { icon: Layers, label: "Substituição de Telha", subtitle: "Reparos de cobertura", type: "substituicao_telha", color: "bg-orange-500/15 text-orange-400" },
  { icon: Sparkles, label: "Limpeza de Telhado", subtitle: "Limpeza de cobertura", type: "limpeza_telhado", color: "bg-yellow-500/15 text-yellow-400" },
  { icon: ChefHat, label: "Coifa de Parede", subtitle: "Instalação de coifa", type: "instalacao_coifa_parede", color: "bg-teal-500/15 text-teal-400" },
  { icon: ShowerHead, label: "Conversão Vaso CX Acoplada", subtitle: "Adaptação sanitária", type: "conversao_vaso_coplado", color: "bg-indigo-500/15 text-indigo-400" },
  { icon: Layers, label: "Reparo Forro de Gesso", subtitle: "Manutenção de forro", type: "reparo_forro_gesso", color: "bg-stone-500/15 text-stone-400" },
  { icon: Droplets, label: "Desentupimento", subtitle: "Desobstrução rápida", type: "desentupimento", color: "bg-orange-500/15 text-orange-400" },
  { icon: Droplets, label: "Caça Vazamento", subtitle: "Detecção de vazamentos", type: "caca_vazamento", color: "bg-sky-500/15 text-sky-400" },
  { icon: ClipboardList, label: "Check-up", subtitle: "Vistoria completa", type: "checkup", color: "bg-emerald-500/15 text-emerald-400" },
  { icon: Layers, label: "Rejunte", subtitle: "Rejunte de azulejos", type: "rejunte", color: "bg-rose-500/15 text-rose-400" },
  { icon: DoorOpen, label: "Portão Eletrônico", subtitle: "Instalação e reparo", type: "portao_eletronico", color: "bg-sky-500/15 text-sky-400" },
  { icon: Gauge, label: "Pressurizador", subtitle: "Instalação e reparo", type: "pressurizador", color: "bg-cyan-500/15 text-cyan-400" },
];

const vehicleServices = [
  { icon: Settings, label: "Troca de Pneu", subtitle: "Pneus novos", type: "troca_pneu", color: "bg-slate-500/15 text-slate-400" },
  { icon: Zap, label: "Recarga Bateria", subtitle: "Carregamento rápido", type: "recarga_bateria", color: "bg-amber-500/15 text-amber-400" },
  { icon: Wrench, label: "Conserto Pneu", subtitle: "Reparo de furos", type: "conserto_pneu", color: "bg-red-500/15 text-red-400" },
  { icon: Truck, label: "Reboque", subtitle: "Transporte seguro", type: "reboque", color: "bg-orange-500/15 text-orange-400" },
];

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
};

export default function Home() {
  const navigate = useNavigate();
  const [splashDone, setSplashDone] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [mainTab, setMainTab] = useState('cliente');
  const [serviceTab, setServiceTab] = useState('casa');
  const [user, setUser] = useState(null);
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
  const [filteredHomeServices, setFilteredHomeServices] = useState(homeServices);
  const [filteredVehicleServices, setFilteredVehicleServices] = useState(vehicleServices);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    const loadActive = () =>
      base44.entities.ServiceRequest.filter({ created_by: user.email }).then(all =>
        setActiveRequests(all.filter(r => !['concluido', 'cancelado'].includes(r.status)))
      );
    loadActive();
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.data?.created_by !== user.email) return;
      setActiveRequests(prev => {
        if (['concluido', 'cancelado'].includes(event.data?.status)) return prev.filter(r => r.id !== event.id);
        const exists = prev.some(r => r.id === event.id);
        if (exists) return prev.map(r => r.id === event.id ? event.data : r);
        return [...prev, event.data];
      });
    });
    return unsub;
  }, [user?.email]);

  const { data: pricingList = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => base44.entities.ServicePricing.list(),
  });

  const getPriceLabel = (serviceType) => {
    const p = pricingList.find(x => x.service_type === serviceType);
    if (!p || p.price_min == null) return null;
    return `R$ ${p.price_min} - R$ ${p.price_max}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {!splashDone && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setSplashDone(true)}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
          >
            <motion.img
              src="https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/ec85c20dc_generated_image.png"
              alt="Reparo Expresso"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full object-contain"
            />
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="absolute bottom-10 text-muted-foreground text-sm font-medium tracking-wide"
            >
              Toque para continuar
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — only renders after splash */}
      {splashDone && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {/* Main tabs card */}
          <div className="max-w-lg mx-auto px-4 pt-4">
            <div className="bg-card rounded-xl shadow-2xl overflow-hidden ring-1 ring-border circuit-bg">
              <div className="flex border-b border-border overflow-x-auto">
                 <button
                   onClick={() => setMainTab('cliente')}
                   className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'cliente' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                 >
                   👤 Cliente
                 </button>
                 <button
                   onClick={() => setMainTab('prestador')}
                   className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'prestador' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                 >
                   🔧 Prestador
                 </button>
                 <button
                   onClick={() => setMainTab('parceiro')}
                   className={`flex-1 py-3.5 text-xs font-display tracking-widest transition-all whitespace-nowrap uppercase ${mainTab === 'parceiro' ? 'text-primary border-b-2 border-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground'}`}
                 >
                   🏪 Parceiro
                 </button>
                 {user && (
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
                     {/* Banner de login para usuários não autenticados */}
                     {userLoaded && !user && (
                       <div className="mb-6 bg-primary/8 border border-primary/25 rounded-xl p-4 flex flex-col gap-3">
                         <p className="text-sm font-semibold text-foreground">👋 Faça login ou crie sua conta para solicitar serviços</p>
                         <div className="flex gap-2">
                           <Button size="sm" className="flex-1 rounded-xl font-semibold" onClick={() => base44.auth.redirectToLogin('/')}>
                             Entrar
                           </Button>
                           <Button size="sm" variant="outline" className="flex-1 rounded-xl font-semibold" onClick={() => base44.auth.redirectToLogin('/')}>
                             Criar conta
                           </Button>
                         </div>
                       </div>
                     )}
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

                     {serviceTab === 'casa' && (
                      <div className="space-y-4">
                        <ServiceSearch
                          services={homeServices}
                          onFilterChange={setFilteredHomeServices}
                          placeholder="Buscar serviços de casa..."
                        />
                        <div className="grid grid-cols-4 gap-3">
                          {filteredHomeServices.map((s, i) => (
                          <motion.div key={`home-${s.type}-${i}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                            {s.type === 'eletrica' ? (
                              <button 
                                onClick={() => setShowElectricalModal(true)}
                                className="w-full h-full"
                              >
                                <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}>
                                    <s.icon className="w-6 h-6" />
                                  </div>
                                  <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                                  <span className="text-xs text-center text-muted-foreground">{s.subtitle}</span>
                                </div>
                              </button>
                            ) : s.type === 'hidraulica' ? (
                              <button 
                                onClick={() => setShowHydraulicModal(true)}
                                className="w-full h-full"
                              >
                                <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}>
                                    <s.icon className="w-6 h-6" />
                                  </div>
                                  <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                                  <span className="text-xs text-center text-muted-foreground">{s.subtitle}</span>
                                </div>
                              </button>
                            ) : (
                             <Link to={`/solicitar?tipo=${s.type}`}>
                               <div className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-accent transition-colors cursor-pointer">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                                   <s.icon className="w-6 h-6" />
                                 </div>
                                 <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                                 <span className="text-xs text-center text-muted-foreground">{getPriceLabel(s.type) || s.subtitle}</span>
                               </div>
                             </Link>
                            )}
                          </motion.div>
                        ))}
                        </div>
                        {filteredHomeServices.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-sm text-muted-foreground">Nenhum serviço encontrado</p>
                        </div>
                        )}
                        </div>
                        )}

                        {/* Modal de Agendamento */}
                    <AnimatePresence>
                      {showScheduleModal && !scheduleType && (
                        <>
                          <motion.div
                            key="overlay-schedule"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowScheduleModal(false)}
                            className="fixed inset-0 bg-black/40 z-50"
                          />
                          <motion.div
                            key="modal-schedule"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-x-4 top-12 z-[60] bg-card rounded-xl p-4 shadow-2xl max-w-sm mx-auto ring-1 ring-border"
                          >
                            <h2 className="text-xl font-bold text-foreground mb-4">Quando você precisa?</h2>
                            <div className="space-y-3">
                              <button
                                onClick={() => setScheduleType('imediato')}
                                className="w-full p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/8 transition-all text-left"
                              >
                                <p className="font-bold text-foreground">⚡ Agora</p>
                                <p className="text-xs text-muted-foreground mt-1">Prestador disponível em minutos</p>
                              </button>
                              <button
                                onClick={() => setScheduleType('agendado')}
                                className="w-full p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/8 transition-all text-left"
                              >
                                <p className="font-bold text-foreground">📅 Agendar</p>
                                <p className="text-xs text-muted-foreground mt-1">Escolher data e hora</p>
                              </button>
                            </div>
                            <button
                              onClick={() => setShowScheduleModal(false)}
                              className="w-full py-2 rounded-2xl text-muted-foreground hover:bg-muted transition-colors mt-4"
                            >
                              Fechar
                            </button>
                          </motion.div>
                        </>
                      )}

                      {showScheduleModal && scheduleType === 'imediato' && (
                        <>
                          <motion.div
                            key="overlay-imediato"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowScheduleModal(false); setScheduleType(null); }}
                            className="fixed inset-0 bg-black/40 z-50"
                          />
                          <motion.div
                            key="modal-imediato"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-x-4 top-12 z-[60] bg-card rounded-xl p-4 shadow-2xl max-w-sm mx-auto ring-1 ring-border"
                          >
                            <button 
                              onClick={() => setScheduleType(null)}
                              className="text-sm text-primary font-semibold mb-3 flex items-center gap-1"
                            >
                              ← Voltar
                            </button>
                            <h2 className="text-xl font-bold text-foreground mb-4">Serviço Imediato</h2>
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                              <p className="text-sm text-emerald-400 font-semibold">✓ Prestadores disponíveis agora!</p>
                              <p className="text-xs text-emerald-500/80 mt-2">Você será conectado a um prestador em até 5 minutos</p>
                            </div>
                            {(selectedElectricalService || selectedHydraulicService) && (
                              <button 
                                onClick={() => {
                                  const isElectrical = selectedElectricalService !== null;
                                  setPendingServiceData({
                                    type: isElectrical ? 'eletrica' : 'hidraulica',
                                    subtipo: isElectrical ? selectedElectricalService.type : selectedHydraulicService.type,
                                    modality: 'imediato',
                                    price: isElectrical ? selectedElectricalService.price : selectedHydraulicService.price
                                  });
                                  setShowPaymentModal(true);
                                  setShowElectricalModal(false);
                                  setShowHydraulicModal(false);
                                  setShowScheduleModal(false);
                                  setSelectedElectricalService(null);
                                  setSelectedHydraulicService(null);
                                }}
                                className="block w-full"
                              >
                                <Button className="w-full h-10 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700">
                                  Confirmar Serviço Imediato
                                </Button>
                              </button>
                            )}
                          </motion.div>
                        </>
                      )}

                      {showScheduleModal && scheduleType === 'agendado' && (
                        <>
                          <motion.div
                            key="overlay-agendado"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowScheduleModal(false); setScheduleType(null); }}
                            className="fixed inset-0 bg-black/40 z-50"
                          />
                          <AvailableScheduleSelector
                            onConfirm={(scheduleData) => {
                              const isElectrical = selectedElectricalService !== null;
                              setPendingServiceData({
                                type: isElectrical ? 'eletrica' : 'hidraulica',
                                subtipo: isElectrical ? selectedElectricalService.type : selectedHydraulicService.type,
                                modality: 'agendado',
                                date: scheduleData.date,
                                time: scheduleData.time,
                                price: isElectrical ? selectedElectricalService.price : selectedHydraulicService.price
                              });
                              setShowPaymentModal(true);
                              setShowElectricalModal(false);
                              setShowHydraulicModal(false);
                              setShowScheduleModal(false);
                              setSelectedElectricalService(null);
                              setSelectedHydraulicService(null);
                            }}
                            onCancel={() => { setShowScheduleModal(false); setScheduleType(null); }}
                          />
                        </>
                      )}
                    </AnimatePresence>

                    {/* Modal de Hidráulica */}
                    <AnimatePresence>
                      {showHydraulicModal && (
                        <>
                          <motion.div
                            key="overlay-hydraulic"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHydraulicModal(false)}
                            className="fixed inset-0 bg-black/40 z-40"
                          />
                          {!selectedHydraulicService ? (
                            <motion.div
                              key="modal-hydraulic-list"
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className={`fixed inset-x-4 z-50 bg-card rounded-xl p-4 shadow-2xl mx-auto transition-all ring-1 ring-border ${hydraulicModalExpanded ? 'top-12 max-w-sm' : 'bottom-4 max-w-xs'}`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h2 className={`font-bold text-foreground ${hydraulicModalExpanded ? 'text-2xl' : 'text-lg'}`}>Serviços Hidráulicos</h2>
                                <button
                                  onClick={() => setHydraulicModalExpanded(!hydraulicModalExpanded)}
                                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                                >
                                  {hydraulicModalExpanded ? <Minimize2 className="w-4 h-4 text-muted-foreground" /> : <Maximize2 className="w-4 h-4 text-muted-foreground" />}
                                </button>
                              </div>
                              {hydraulicModalExpanded && (
                                <div className="space-y-2 mb-4">
                                  {hydraulicServices.map(service => (
                                    <button 
                                      key={service.type}
                                      onClick={() => setSelectedHydraulicService(service)}
                                      className="w-full px-4 py-3 text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary/8 transition-all font-semibold text-foreground"
                                    >
                                      💧 {service.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {hydraulicModalExpanded && (
                                <button
                                  onClick={() => setShowHydraulicModal(false)}
                                  className="w-full py-2 rounded-2xl text-muted-foreground hover:bg-muted transition-colors"
                                >
                                  Fechar
                                </button>
                              )}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="modal-hydraulic-detail"
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className="fixed inset-x-4 top-12 z-50 bg-card rounded-xl p-4 shadow-2xl max-w-sm mx-auto ring-1 ring-border"
                            >
                              <button 
                                onClick={() => setSelectedHydraulicService(null)}
                                className="text-sm text-primary font-semibold mb-3 flex items-center gap-1"
                              >
                                ← Voltar
                              </button>
                              <h2 className="text-2xl font-bold text-foreground mb-2">💧 {selectedHydraulicService.label}</h2>
                              <div className="bg-primary/10 rounded-xl p-4 mb-4 border border-primary/30">
                                <p className="text-sm text-muted-foreground mb-1">Valor estimado:</p>
                                <p className="text-2xl font-bold text-primary">{getPriceLabel('hidraulica') || selectedHydraulicService.price}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">Prestadores disponíveis em sua região</p>
                              <Button 
                                onClick={() => setShowScheduleModal(true)}
                                className="w-full h-10 rounded-2xl font-bold text-sm"
                              >
                                Agendar Serviço
                              </Button>
                            </motion.div>
                          )}
                        </>
                      )}
                    </AnimatePresence>

                    {/* Modal de Elétrica */}
                    <AnimatePresence>
                      {showElectricalModal && (
                        <>
                          <motion.div
                            key="overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowElectricalModal(false)}
                            className="fixed inset-0 bg-black/40 z-40"
                          />
                          {!selectedElectricalService ? (
                            <motion.div
                              key="modal-list"
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className={`fixed inset-x-4 z-50 bg-card rounded-xl p-4 shadow-2xl mx-auto transition-all ring-1 ring-border ${electricalModalExpanded ? 'top-12 max-w-sm' : 'bottom-4 max-w-xs'}`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h2 className={`font-bold text-foreground ${electricalModalExpanded ? 'text-2xl' : 'text-lg'}`}>Serviços Elétricos</h2>
                                <button
                                  onClick={() => setElectricalModalExpanded(!electricalModalExpanded)}
                                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                                >
                                  {electricalModalExpanded ? <Minimize2 className="w-4 h-4 text-muted-foreground" /> : <Maximize2 className="w-4 h-4 text-muted-foreground" />}
                                </button>
                              </div>
                              {electricalModalExpanded && (
                                <div className="space-y-2 mb-4">
                                  {electricalServices.map(service => (
                                    <button 
                                      key={service.type}
                                      onClick={() => setSelectedElectricalService(service)}
                                      className="w-full px-4 py-3 text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary/8 transition-all font-semibold text-foreground"
                                    >
                                      ⚡ {service.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {electricalModalExpanded && (
                                <button
                                  onClick={() => setShowElectricalModal(false)}
                                  className="w-full py-2 rounded-2xl text-muted-foreground hover:bg-muted transition-colors"
                                >
                                  Fechar
                                </button>
                              )}
                              </motion.div>
                              ) : (
                            <motion.div
                              key="modal-detail"
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className="fixed inset-x-4 top-12 z-50 bg-card rounded-xl p-4 shadow-2xl max-w-sm mx-auto ring-1 ring-border"
                            >
                              <button 
                                onClick={() => setSelectedElectricalService(null)}
                                className="text-sm text-primary font-semibold mb-3 flex items-center gap-1"
                              >
                                ← Voltar
                              </button>
                              <h2 className="text-2xl font-bold text-foreground mb-2">⚡ {selectedElectricalService.label}</h2>
                              <div className="bg-primary/10 rounded-xl p-4 mb-4 border border-primary/30">
                                <p className="text-sm text-muted-foreground mb-1">Valor estimado:</p>
                                <p className="text-2xl font-bold text-primary">{getPriceLabel('eletrica') || selectedElectricalService.price}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mb-4">Prestadores disponíveis em sua região</p>
                              <Button 
                                onClick={() => setShowScheduleModal(true)}
                                className="w-full h-10 rounded-2xl font-bold text-sm"
                              >
                                Agendar Serviço
                              </Button>
                            </motion.div>
                          )}
                        </>
                      )}
                    </AnimatePresence>

                    {serviceTab === 'veiculo' && (
                       <div className="space-y-4">
                         <p className="text-xs text-muted-foreground">Atendimento emergencial para veículos — prestadores homologados pela Escola Prática</p>
                         <ServiceSearch
                           services={vehicleServices}
                           onFilterChange={setFilteredVehicleServices}
                           placeholder="Buscar serviços para veículos..."
                         />
                         <div className="grid grid-cols-3 gap-3">
                           {filteredVehicleServices.map((s, i) => (
                            <motion.div key={`vehicle-${s.type}-${i}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                              <Link to={`/solicitar?tipo=${s.type}`}>
                                <div className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-accent hover:border-primary/20 transition-colors cursor-pointer border border-border">
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}>
                                    <s.icon className="w-6 h-6" />
                                  </div>
                                  <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                                  <span className="text-xs text-center text-muted-foreground">{s.subtitle}</span>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                          </div>
                          {filteredVehicleServices.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">Nenhum serviço encontrado</p>
                          </div>
                          )}
                          </div>
                          )}
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
          <div className="max-w-lg mx-auto px-4 mt-4">
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
          <div className="max-w-lg mx-auto px-4 mt-4 grid grid-cols-3 gap-3 pb-10">
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
      )}
    </div>
  );
}