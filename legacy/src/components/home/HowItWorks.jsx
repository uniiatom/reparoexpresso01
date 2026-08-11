import React from 'react';
import { Search, MessageSquare, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Search,
    title: "Descreva o serviço",
    description: "Conte-nos o que você precisa e receba orçamentos de profissionais qualificados.",
    number: "01"
  },
  {
    icon: MessageSquare,
    title: "Compare orçamentos",
    description: "Receba propostas de diferentes profissionais e compare preços e avaliações.",
    number: "02"
  },
  {
    icon: ThumbsUp,
    title: "Contrate o melhor",
    description: "Escolha o profissional ideal e agende o serviço com total segurança.",
    number: "03"
  }
];

export default function HowItWorks() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Como Funciona</h2>
          <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
            Contratar um profissional nunca foi tão fácil
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <span className="absolute top-0 right-1/2 translate-x-14 -translate-y-2 text-6xl font-black text-muted/60 select-none">
                {step.number}
              </span>
              <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}