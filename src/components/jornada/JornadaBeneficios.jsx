import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Star, Zap, Shield, Clock, Gift, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIVEIS, getNivelAtual } from './JornadaHeroCard';

const BENEFICIOS = [
  {
    id: 'desconto_progressivo',
    titulo: 'Desconto Progressivo',
    icon: Gift,
    cor: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    itens: [
      { nivel: 1, desc: 'Sem desconto automático', min: 0 },
      { nivel: 2, desc: '5% de desconto em todos os serviços', min: 3 },
      { nivel: 3, desc: '10% de desconto em todos os serviços', min: 8 },
      { nivel: 4, desc: '15% de desconto em todos os serviços', min: 15 },
      { nivel: 5, desc: '20% de desconto — máximo benefício!', min: 25 },
    ],
  },
  {
    id: 'prioridade',
    titulo: 'Agendamento Prioritário',
    icon: Zap,
    cor: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    itens: [
      { nivel: 1, desc: 'Agendamento padrão', min: 0 },
      { nivel: 2, desc: 'Agendamento padrão', min: 3 },
      { nivel: 3, desc: 'Agendamento padrão', min: 8 },
      { nivel: 4, desc: 'Fila prioritária — atendido antes', min: 15 },
      { nivel: 5, desc: 'Máxima prioridade — atendimento imediato', min: 25 },
    ],
  },
  {
    id: 'prestadores',
    titulo: 'Acesso a Prestadores',
    icon: Star,
    cor: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    itens: [
      { nivel: 1, desc: 'Prestadores disponíveis na região', min: 0 },
      { nivel: 2, desc: 'Prestadores disponíveis na região', min: 3 },
      { nivel: 3, desc: 'Acesso a prestadores exclusivos e certificados', min: 8 },
      { nivel: 4, desc: 'Acesso a prestadores Top da plataforma', min: 15 },
      { nivel: 5, desc: 'Acesso a todos os prestadores + parceiros premium', min: 25 },
    ],
  },
  {
    id: 'garantia',
    titulo: 'Garantia do Serviço',
    icon: Shield,
    cor: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    itens: [
      { nivel: 1, desc: 'Garantia padrão 30 dias', min: 0 },
      { nivel: 2, desc: 'Garantia padrão 30 dias', min: 3 },
      { nivel: 3, desc: 'Garantia padrão 30 dias', min: 8 },
      { nivel: 4, desc: 'Garantia estendida 60 dias', min: 15 },
      { nivel: 5, desc: 'Garantia VIP 90 dias + revisão gratuita', min: 25 },
    ],
  },
  {
    id: 'suporte',
    titulo: 'Suporte ao Cliente',
    icon: Crown,
    cor: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    itens: [
      { nivel: 1, desc: 'Suporte padrão via app', min: 0 },
      { nivel: 2, desc: 'Suporte padrão via app', min: 3 },
      { nivel: 3, desc: 'Suporte preferencial por chat', min: 8 },
      { nivel: 4, desc: 'Suporte dedicado via WhatsApp', min: 15 },
      { nivel: 5, desc: 'Suporte VIP — atendente exclusivo', min: 25 },
    ],
  },
];

export default function JornadaBeneficios({ totalServices }) {
  const nivelAtual = getNivelAtual(totalServices);

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center gap-3">
        <span className="text-2xl">{nivelAtual.emoji}</span>
        <div>
          <p className="text-sm font-bold text-foreground">Seu nível atual: {nivelAtual.nome}</p>
          <p className="text-xs text-muted-foreground">Benefícios ativos marcados com ✅</p>
        </div>
      </div>

      {BENEFICIOS.map((ben, bIdx) => {
        const Icon = ben.icon;
        const itemAtual = [...ben.itens].reverse().find(i => totalServices >= i.min) || ben.itens[0];

        return (
          <motion.div
            key={ben.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: bIdx * 0.08 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            {/* Header do benefício */}
            <div className={cn('flex items-center gap-3 px-4 py-3 border-b border-border', ben.bg)}>
              <Icon className={cn('w-5 h-5 flex-shrink-0', ben.cor)} />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{ben.titulo}</p>
                <p className="text-xs text-muted-foreground">Atual: {itemAtual.desc}</p>
              </div>
            </div>

            {/* Níveis */}
            <div className="divide-y divide-border/50">
              {ben.itens.map((item) => {
                const isAtivo = totalServices >= item.min;
                const isAtual = item.nivel === nivelAtual.id;
                const nivel = NIVEIS.find(n => n.id === item.nivel);

                return (
                  <div
                    key={item.nivel}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 transition-all',
                      isAtivo && 'bg-green-500/5',
                      isAtual && 'bg-primary/5'
                    )}
                  >
                    <span className="text-base w-6 text-center flex-shrink-0">{nivel?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-xs',
                        isAtivo ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>
                        {item.desc}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {isAtivo ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* CTA */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
        <p className="font-bold text-foreground text-sm mb-1">💡 Como subir de nível?</p>
        <p className="text-xs text-muted-foreground">
          Cada serviço concluído conta! Continue solicitando serviços na plataforma para desbloquear benefícios exclusivos.
        </p>
      </div>
    </div>
  );
}