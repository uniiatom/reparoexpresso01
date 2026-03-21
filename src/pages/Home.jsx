import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Wrench, Zap, Droplets, Paintbrush, Wind, Lock, Hammer, Settings, Star, Shield, Clock, Car, UserCheck, ClipboardList, BadgeCheck, Smartphone, Waves, Layers, HardHat, Thermometer, ChefHat, Truck, ShowerHead, Pipette, Gift, Heart, Store } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReferralCard from "@/components/ReferralCard";
import FavoritesList from "@/components/FavoritesList";

const homeServices = [
  { icon: Zap, label: "Elétrica", type: "eletrica", color: "bg-yellow-100 text-yellow-700" },
  { icon: Pipette, label: "Hidráulica", type: "hidraulica", color: "bg-blue-100 text-blue-700" },
  { icon: Paintbrush, label: "Pintura", type: "pintura", color: "bg-orange-100 text-orange-700" },
  { icon: Wrench, label: "Reparo Geral", type: "reparo_geral", color: "bg-gray-100 text-gray-700" },
  { icon: Settings, label: "Montagem", type: "montagem", color: "bg-purple-100 text-purple-700" },
  { icon: HardHat, label: "Alvenaria", type: "alvenaria", color: "bg-red-100 text-red-700" },
  { icon: Lock, label: "Fechadura", type: "fechadura", color: "bg-green-100 text-green-700" },
  { icon: Thermometer, label: "Ar Condicionado", type: "ar_condicionado", color: "bg-cyan-100 text-cyan-700" },
  { icon: Waves, label: "Limpeza Caixa d'Água", type: "limpeza_caixa_dagua", color: "bg-blue-100 text-blue-700" },
  { icon: Droplets, label: "Limpeza de Calha", type: "limpeza_calha", color: "bg-slate-100 text-slate-700" },
  { icon: Layers, label: "Substituição de Telha", type: "substituicao_telha", color: "bg-orange-100 text-orange-700" },
  { icon: Hammer, label: "Limpeza de Telhado", type: "limpeza_telhado", color: "bg-amber-100 text-amber-700" },
  { icon: ChefHat, label: "Coifa de Parede", type: "instalacao_coifa_parede", color: "bg-teal-100 text-teal-700" },
  { icon: ChefHat, label: "Coifa Ilha", type: "instalacao_coifa_ilha", color: "bg-emerald-100 text-emerald-700" },
  { icon: ShowerHead, label: "Conversão Vaso CX Acoplada", type: "conversao_vaso_coplado", color: "bg-indigo-100 text-indigo-700" },
  { icon: ShowerHead, label: "Vaso Monobloco", type: "instalacao_vaso_monobloco", color: "bg-violet-100 text-violet-700" },
  { icon: Layers, label: "Reparo Forro de Gesso", type: "reparo_forro_gesso", color: "bg-stone-100 text-stone-700" },
  { icon: Droplets, label: "Desentupimento", type: "desentupimento", color: "bg-amber-100 text-amber-700" },
  { icon: Lock, label: "Chaveiro", type: "fechadura", color: "bg-green-100 text-green-700" },
];

const vehicleServices = [
  { icon: Settings, label: "Troca de Pneu", type: "troca_pneu", color: "bg-slate-100 text-slate-700" },
  { icon: Zap, label: "Recarga Bateria", type: "recarga_bateria", color: "bg-yellow-100 text-yellow-700" },
  { icon: Wrench, label: "Conserto Pneu", type: "conserto_pneu", color: "bg-red-100 text-red-700" },
  { icon: Truck, label: "Reboque", type: "reboque", color: "bg-orange-100 text-orange-700" },
];

const electricalServices = [
  { label: "Chuveiro", type: "eletrica_chuveiro", price: "R$ 80 - R$ 150" },
  { label: "Tomada", type: "eletrica_tomada", price: "R$ 60 - R$ 120" },
  { label: "QDC", type: "eletrica_qdc", price: "R$ 100 - R$ 200" },
  { label: "Curto-circuito", type: "eletrica_curto", price: "R$ 120 - R$ 250" },
  { label: "Troca de Lâmpada", type: "eletrica_lampada", price: "R$ 40 - R$ 80" },
];

export default function Home() {
  const [splashDone, setSplashDone] = useState(false);
  const [mainTab, setMainTab] = useState('cliente');
  const [serviceTab, setServiceTab] = useState('casa');
  const [user, setUser] = useState(null);
  const [showElectricalModal, setShowElectricalModal] = useState(false);
  const [selectedElectricalService, setSelectedElectricalService] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleType, setScheduleType] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {!splashDone && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 bg-gradient-to-br from-primary to-primary/80 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setSplashDone(true)}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
          >
            {/* decorative dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-white/20 rounded-full"
                  style={{ left: `${(i * 37 + 5) % 100}%`, top: `${(i * 53 + 10) % 100}%` }}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center gap-8 px-8 text-center"
            >
              <img
                src="https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/b2b780191_d9741c6a-dbbe-4b19-a2b3-b5734557ae14.jpg"
                alt="Me Socorro"
                className="w-72 max-w-xs object-contain drop-shadow-2xl"
              />
              <p className="text-white/80 text-lg max-w-xs">
                Profissionais qualificados podendo chegar em minutos
              </p>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="text-white/60 text-sm mt-4"
              >
                Toque para continuar
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — only renders after splash */}
      {splashDone && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {/* Main tabs card */}
          <div className="max-w-lg mx-auto px-4 pt-4">
            <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
              <div className="flex border-b border-border overflow-x-auto">
                 <button
                   onClick={() => setMainTab('cliente')}
                   className={`flex-1 py-4 text-sm font-bold transition-all whitespace-nowrap ${mainTab === 'cliente' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground'}`}
                 >
                   👤 Cliente
                 </button>
                 <button
                   onClick={() => setMainTab('prestador')}
                   className={`flex-1 py-4 text-sm font-bold transition-all whitespace-nowrap ${mainTab === 'prestador' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground'}`}
                 >
                   🔧 Prestador
                 </button>
                 <button
                   onClick={() => setMainTab('parceiro')}
                   className={`flex-1 py-4 text-sm font-bold transition-all whitespace-nowrap ${mainTab === 'parceiro' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground'}`}
                 >
                   🏪 Parceiro
                 </button>
                 {user && (
                   <>
                     <button
                       onClick={() => setMainTab('favoritos')}
                       className={`flex-1 py-4 text-sm font-bold transition-all whitespace-nowrap ${mainTab === 'favoritos' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground'}`}
                     >
                       ❤️ Favoritos
                     </button>
                     <button
                       onClick={() => setMainTab('promocao')}
                       className={`flex-1 py-4 text-sm font-bold transition-all whitespace-nowrap ${mainTab === 'promocao' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground'}`}
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
                     <div className="flex gap-2 mb-8">
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
                      <div className="grid grid-cols-4 gap-3">
                        {homeServices.map((s, i) => (
                          <motion.div key={s.type} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                            {s.type === 'eletrica' ? (
                              <button 
                                onClick={() => setShowElectricalModal(true)}
                                className="w-full h-full"
                              >
                                <div className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-accent transition-colors cursor-pointer">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                                    <s.icon className="w-6 h-6" />
                                  </div>
                                  <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                                </div>
                              </button>
                            ) : (
                              <Link to={`/solicitar?tipo=${s.type}`}>
                                <div className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-accent transition-colors cursor-pointer">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                                    <s.icon className="w-6 h-6" />
                                  </div>
                                  <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                                </div>
                              </Link>
                            )}
                          </motion.div>
                        ))}
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
                            className="fixed inset-x-4 top-12 z-[60] bg-card rounded-3xl p-4 shadow-2xl max-w-sm mx-auto"
                          >
                            <h2 className="text-xl font-bold text-foreground mb-4">Quando você precisa?</h2>
                            <div className="space-y-3">
                              <button
                                onClick={() => setScheduleType('imediato')}
                                className="w-full p-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                              >
                                <p className="font-bold text-foreground">⚡ Agora</p>
                                <p className="text-xs text-muted-foreground mt-1">Prestador disponível em minutos</p>
                              </button>
                              <button
                                onClick={() => setScheduleType('agendado')}
                                className="w-full p-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
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
                            className="fixed inset-x-4 top-12 z-[60] bg-card rounded-3xl p-4 shadow-2xl max-w-sm mx-auto"
                          >
                            <button 
                              onClick={() => setScheduleType(null)}
                              className="text-sm text-primary font-semibold mb-3 flex items-center gap-1"
                            >
                              ← Voltar
                            </button>
                            <h2 className="text-xl font-bold text-foreground mb-4">Serviço Imediato</h2>
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                              <p className="text-sm text-green-800 font-semibold">✓ Prestadores disponíveis agora!</p>
                              <p className="text-xs text-green-700 mt-2">Você será conectado a um prestador em até 5 minutos</p>
                            </div>
                            {selectedElectricalService && (
                              <Link 
                                to={`/solicitar?tipo=eletrica&subtipo=${selectedElectricalService.type}&modality=imediato`}
                                onClick={() => { setShowElectricalModal(false); setShowScheduleModal(false); }}
                                className="block"
                              >
                                <Button className="w-full h-10 rounded-2xl font-bold text-sm bg-green-600 hover:bg-green-700">
                                  Confirmar Serviço Imediato
                                </Button>
                              </Link>
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
                          <motion.div
                            key="modal-agendado"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-x-4 top-12 z-[60] bg-card rounded-3xl p-4 shadow-2xl max-w-sm mx-auto max-h-[70vh] overflow-y-auto"
                          >
                            <button 
                              onClick={() => setScheduleType(null)}
                              className="text-sm text-primary font-semibold mb-3 flex items-center gap-1"
                            >
                              ← Voltar
                            </button>
                            <h2 className="text-xl font-bold text-foreground mb-4">Agendar Serviço</h2>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-semibold text-foreground block mb-2">Selecione a data</label>
                                <input 
                                  type="date" 
                                  value={scheduledDate}
                                  onChange={(e) => setScheduledDate(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary outline-none text-sm"
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-foreground block mb-2">Selecione a hora</label>
                                <select 
                                  value={scheduledTime}
                                  onChange={(e) => setScheduledTime(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary outline-none text-sm"
                                >
                                  <option value="">Escolher horário</option>
                                  <option value="08:00">08:00</option>
                                  <option value="09:00">09:00</option>
                                  <option value="10:00">10:00</option>
                                  <option value="11:00">11:00</option>
                                  <option value="14:00">14:00</option>
                                  <option value="15:00">15:00</option>
                                  <option value="16:00">16:00</option>
                                  <option value="17:00">17:00</option>
                                </select>
                              </div>
                            </div>
                            {selectedElectricalService && scheduledDate && scheduledTime && (
                              <Link 
                                to={`/solicitar?tipo=eletrica&subtipo=${selectedElectricalService.type}&modality=agendado&date=${scheduledDate}&time=${scheduledTime}`}
                                onClick={() => { setShowElectricalModal(false); setShowScheduleModal(false); setScheduledDate(''); setScheduledTime(''); }}
                                className="block mt-6"
                              >
                                <Button className="w-full h-10 rounded-2xl font-bold text-sm">
                                  Confirmar Agendamento
                                </Button>
                              </Link>
                            )}
                            {(!scheduledDate || !scheduledTime) && (
                              <div className="mt-6 p-3 bg-muted rounded-2xl text-center">
                                <p className="text-xs text-muted-foreground">Selecione data e hora para continuar</p>
                              </div>
                            )}
                          </motion.div>
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
                              className="fixed inset-x-4 top-12 z-50 bg-card rounded-3xl p-4 shadow-2xl max-w-sm mx-auto"
                            >
                              <h2 className="text-2xl font-bold text-foreground mb-4">Serviços Elétricos</h2>
                              <div className="space-y-2 mb-4">
                                {electricalServices.map(service => (
                                  <button 
                                    key={service.type}
                                    onClick={() => setSelectedElectricalService(service)}
                                    className="w-full px-4 py-3 text-left rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all font-semibold text-foreground"
                                  >
                                    ⚡ {service.label}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => setShowElectricalModal(false)}
                                className="w-full py-2 rounded-2xl text-muted-foreground hover:bg-muted transition-colors"
                              >
                                Fechar
                              </button>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="modal-detail"
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className="fixed inset-x-4 top-12 z-50 bg-card rounded-3xl p-4 shadow-2xl max-w-sm mx-auto"
                            >
                              <button 
                                onClick={() => setSelectedElectricalService(null)}
                                className="text-sm text-primary font-semibold mb-3 flex items-center gap-1"
                              >
                                ← Voltar
                              </button>
                              <h2 className="text-2xl font-bold text-foreground mb-2">⚡ {selectedElectricalService.label}</h2>
                              <div className="bg-primary/10 rounded-2xl p-4 mb-4 border border-primary/20">
                                <p className="text-sm text-muted-foreground mb-1">Valor estimado:</p>
                                <p className="text-2xl font-bold text-primary">{selectedElectricalService.price}</p>
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
                      <div>
                        <p className="text-xs text-muted-foreground mb-4">Atendimento emergencial para veículos — prestadores homologados pela Escola Prática</p>
                        <div className="grid grid-cols-3 gap-3">
                          {vehicleServices.map((s, i) => (
                            <motion.div key={s.type} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                              <Link to={`/solicitar?tipo=${s.type}`}>
                                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-accent transition-colors cursor-pointer border border-border">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                                    <s.icon className="w-6 h-6" />
                                  </div>
                                  <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
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
                        <div key={item.title} className="flex items-start gap-3 p-3 bg-muted/50 rounded-2xl">
                          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-5 h-5 text-primary" />
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
                        <div key={item.title} className="flex items-start gap-3 p-3 bg-muted/50 rounded-2xl">
                          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-5 h-5 text-primary" />
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

          {/* Trust */}
          <div className="max-w-lg mx-auto px-4 mt-6 grid grid-cols-3 gap-3 pb-10">
            {[
              { icon: Shield, title: "Homologados", desc: "Certificados pela Escola Prática" },
              { icon: Clock, title: "Rápido", desc: "Previsão de chegada em tempo real" },
              { icon: Star, title: "Avaliados", desc: "Veja notas reais de clientes" },
            ].map(item => (
              <div key={item.title} className="bg-card rounded-2xl p-4 text-center border border-border">
                <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}