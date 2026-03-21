import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Droplets, Paintbrush, Wrench, Settings, Hammer, Lock, Wind, ChefHat, ShowerHead, Layers, Truck, Car, Home, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const SERVICES = [
  { icon: Home, type: "casa", label: "Voltar" },
  { icon: Zap, type: "eletrica", label: "Elétrica" },
  { icon: Droplets, type: "hidraulica", label: "Hidráulica" },
  { icon: Paintbrush, type: "pintura", label: "Pintura" },
  { icon: Wrench, type: "reparo_geral", label: "Reparo" },
  { icon: Settings, type: "montagem", label: "Montagem" },
  { icon: Hammer, type: "alvenaria", label: "Alvenaria" },
  { icon: Lock, type: "fechadura", label: "Fechadura" },
  { icon: Wind, type: "ar_condicionado", label: "Ar Cond." },
  { icon: Droplets, type: "desentupimento", label: "Desentupimento" },
  { icon: Car, type: "troca_pneu", label: "Pneu" },
  { icon: Truck, type: "reboque", label: "Reboque" },
];

export default function ServiceSidebar() {
  const [showLabels, setShowLabels] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all"
      >
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/20 z-30 sm:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-30 sm:hidden overflow-y-auto"
            >
              <div className="p-4 space-y-2">
                {SERVICES.map((service) => {
                  const Icon = service.icon;
                  return (
                    <Link
                      key={service.type}
                      to={service.type === 'casa' ? '/' : `/solicitar?tipo=${service.type}`}
                      onClick={() => setOpen(false)}
                      className="w-full"
                    >
                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors text-foreground font-medium">
                        <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                        <span>{service.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside className="hidden sm:flex fixed left-0 top-14 w-20 h-[calc(100vh-56px)] bg-card border-r border-border flex-col items-center py-4 z-40 group hover:w-64 transition-all duration-300">
        <div className="space-y-2 flex-1 overflow-y-auto">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.type}
                to={service.type === 'casa' ? '/' : `/solicitar?tipo=${service.type}`}
                className="block"
              >
                <button
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:bg-accent text-primary group-hover:w-full group-hover:justify-start group-hover:px-4",
                    "flex-shrink-0"
                  )}
                  title={service.label}
                >
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <span className="hidden group-hover:inline-block ml-3 font-medium text-foreground text-sm whitespace-nowrap">
                    {service.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main content margin */}
      <style>{`
        @media (min-width: 640px) {
          main {
            margin-left: 80px;
          }
        }
      `}</style>
    </>
  );
}