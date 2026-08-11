import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, MessageSquare, ThumbsUp, Shield, Clock, Star, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Search,
    title: "1. Diga o que precisa",
    description: "Descreva o serviço que você precisa com detalhes. Quanto mais informações, melhores serão os orçamentos que você receberá."
  },
  {
    icon: MessageSquare,
    title: "2. Receba orçamentos",
    description: "Profissionais qualificados da sua região enviarão propostas com preços e prazos. Compare e escolha o melhor."
  },
  {
    icon: ThumbsUp,
    title: "3. Contrate com segurança",
    description: "Escolha o profissional ideal baseado em avaliações, preço e experiência. Tudo com a garantia ServiçoPro."
  }
];

const benefits = [
  { icon: Shield, title: "Profissionais Verificados", description: "Todos os profissionais passam por verificação de identidade e qualificação." },
  { icon: Clock, title: "Resposta Rápida", description: "Receba orçamentos em até 2 horas após sua solicitação." },
  { icon: Star, title: "Avaliações Reais", description: "Veja avaliações de clientes reais antes de contratar." },
  { icon: Users, title: "Suporte Dedicado", description: "Nossa equipe está disponível para ajudar em qualquer etapa." },
];

export default function HowItWorks() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Como Funciona</h1>
        <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
          Contratar um profissional na ServiçoPro é simples, rápido e seguro
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
          >
            <Card className="p-8 text-center h-full bg-card hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <step.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mb-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-10">Por que escolher a ServiçoPro?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <b.icon className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">{b.title}</h4>
              <p className="text-sm text-muted-foreground">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="text-center bg-primary/5 rounded-3xl p-10">
        <h2 className="text-2xl font-bold text-foreground mb-3">Pronto para começar?</h2>
        <p className="text-muted-foreground mb-6">Solicite um orçamento grátis agora mesmo!</p>
        <Link to="/request-quote">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            Pedir Orçamento Grátis <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}