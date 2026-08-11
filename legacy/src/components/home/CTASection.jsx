import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <section className="py-20 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground leading-tight">
              É profissional? Cadastre-se e receba novos clientes
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg leading-relaxed">
              Junte-se a milhares de profissionais que já aumentaram sua renda com a ServiçoPro.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="mt-8 bg-white text-primary hover:bg-white/90 font-semibold shadow-xl">
                <Briefcase className="w-5 h-5 mr-2" />
                Cadastrar como Profissional
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { value: "50k+", label: "Clientes Ativos" },
              { value: "5k+", label: "Profissionais" },
              { value: "98%", label: "Satisfação" },
              { value: "200k+", label: "Serviços Realizados" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <p className="text-3xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-sm text-primary-foreground/70 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}