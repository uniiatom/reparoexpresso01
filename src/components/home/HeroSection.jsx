import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Star, Shield, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function HeroSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/professionals?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  const stats = [
    { icon: Star, label: "Profissionais Avaliados", value: "5.000+" },
    { icon: Shield, label: "Serviços Garantidos", value: "100%" },
    { icon: Clock, label: "Resposta Rápida", value: "< 2h" },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Mais de 500 categorias de serviço
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight tracking-tight">
              Encontre o profissional
              <span className="text-primary block">ideal para você</span>
            </h1>

            <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Conectamos você aos melhores profissionais da sua região. 
              Peça orçamentos grátis e compare preços.
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="O que você precisa? Ex: Encanador, Eletricista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-base border-border/60 bg-card shadow-sm rounded-xl"
              />
            </div>
            <Button type="submit" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20">
              Buscar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 grid grid-cols-3 gap-6"
          >
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xl sm:text-2xl font-bold text-foreground">{value}</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}