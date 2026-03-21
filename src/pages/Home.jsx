import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Wrench, Zap, Droplets, Paintbrush, Wind, Lock, Hammer, Settings, ArrowRight, Star, Shield, Clock, Car, UserCheck, ClipboardList, BadgeCheck, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

const homeServices = [
  { icon: Zap, label: "Elétrica", type: "eletrica", color: "bg-yellow-100 text-yellow-700" },
  { icon: Droplets, label: "Hidráulica", type: "hidraulica", color: "bg-blue-100 text-blue-700" },
  { icon: Paintbrush, label: "Pintura", type: "pintura", color: "bg-orange-100 text-orange-700" },
  { icon: Wrench, label: "Reparo Geral", type: "reparo_geral", color: "bg-gray-100 text-gray-700" },
  { icon: Settings, label: "Montagem", type: "montagem", color: "bg-purple-100 text-purple-700" },
  { icon: Hammer, label: "Alvenaria", type: "alvenaria", color: "bg-red-100 text-red-700" },
  { icon: Lock, label: "Fechadura", type: "fechadura", color: "bg-green-100 text-green-700" },
  { icon: Wind, label: "Ar Condicionado", type: "ar_condicionado", color: "bg-cyan-100 text-cyan-700" },
];

const vehicleServices = [
  { icon: Car, label: "Troca de Pneu", type: "troca_pneu", color: "bg-slate-100 text-slate-700" },
  { icon: Zap, label: "Recarga Bateria", type: "recarga_bateria", color: "bg-yellow-100 text-yellow-700" },
  { icon: Wrench, label: "Conserto Pneu", type: "conserto_pneu", color: "bg-red-100 text-red-700" },
];

export default function Home() {
  const [mainTab, setMainTab] = useState('cliente');
  const [serviceTab, setServiceTab] = useState('casa');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/90 to-primary px-4 pt-14 pb-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-2 h-2 bg-white rounded-full" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%` }} />
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <img
            src="https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/b2b780191_d9741c6a-dbbe-4b19-a2b3-b5734557ae14.jpg"
            alt="Me Socorro - Marido de Aluguel"
            className="h-36 w-auto object-contain mx-auto mb-2 drop-shadow-xl"
          />
          <p className="text-white/80 mt-2 text-lg max-w-sm mx-auto">
            Profissionais qualificados a caminho em minutos
          </p>
        </motion.div>
      </div>

      {/* Main tabs card */}
      <div className="max-w-lg mx-auto px-4 -mt-10">
        <div className="bg-card rounded-3xl shadow-xl overflow-hidden">
          {/* Main tab switcher */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setMainTab('cliente')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${mainTab === 'cliente' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground'}`}
            >
              👤 Sou Cliente
            </button>
            <button
              onClick={() => setMainTab('prestador')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${mainTab === 'prestador' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground'}`}
            >
              🔧 Sou Prestador
            </button>
          </div>

          <div className="p-6">
            {/* ── CLIENTE ── */}
            {mainTab === 'cliente' && (
              <motion.div key="cliente" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Service tabs */}
                <div className="flex gap-2 mb-5">
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
                        <Link to={`/solicitar?tipo=${s.type}`}>
                          <div className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-accent transition-colors cursor-pointer">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                              <s.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs text-center text-foreground font-medium leading-tight">{s.label}</span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}

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

            {/* ── PRESTADOR ── */}
            {mainTab === 'prestador' && (
              <motion.div key="prestador" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Faça parte da nossa rede de profissionais homologados pela <span className="font-semibold text-foreground">Escola Prática</span>
                </p>

                {/* Benefits */}
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
    </div>
  );
}