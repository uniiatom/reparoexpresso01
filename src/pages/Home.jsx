import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Wrench, Zap, Droplets, Paintbrush, Wind, Lock, Hammer, Settings, ArrowRight, Star, Shield, Clock, Car } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState('casa');
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/90 to-primary px-4 pt-14 pb-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-2 h-2 bg-white rounded-full" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%` }} />
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wrench className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Marido de<br />Aluguel
          </h1>
          <p className="text-white/80 mt-3 text-lg max-w-sm mx-auto">
            Profissionais qualificados a caminho em minutos
          </p>
          <Link to="/solicitar">
            <Button size="lg" className="mt-8 bg-white text-primary hover:bg-white/90 font-bold text-base px-8 h-14 rounded-2xl shadow-xl">
              Pedir Serviço Agora <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Serviços */}
      <div className="max-w-lg mx-auto px-4 -mt-8">
        <div className="bg-card rounded-3xl shadow-xl p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setActiveTab('casa')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'casa' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              🏠 Casa
            </button>
            <button
              onClick={() => setActiveTab('veiculo')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'veiculo' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              🚗 Veículo
            </button>
          </div>

          {activeTab === 'casa' && (
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

          {activeTab === 'veiculo' && (
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