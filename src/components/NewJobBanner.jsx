import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, MapPin, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  troca_pneu: "Troca de Pneu", recarga_bateria: "Recarga de Bateria",
  conserto_pneu: "Conserto de Pneu", veiculo_outros: "Veículo - Outros",
  outros: "Outros",
};

const URGENCY_COLORS = {
  agora: "bg-red-500",
  hoje: "bg-orange-500",
  esta_semana: "bg-yellow-500",
};

/**
 * Banner que aparece na parte inferior da tela quando chega um novo chamado.
 * Auto-dismiss após 30s.
 */
export default function NewJobBanner({ job, onAccept, onDecline }) {

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-4 left-0 right-0 z-50 px-4 max-w-lg mx-auto"
        >
          <div className="bg-card border-2 border-primary rounded-3xl shadow-2xl overflow-hidden">
            {/* Pulso animado no topo */}
            <div className="h-1.5 bg-primary animate-pulse" />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center animate-bounce">
                    <BellRing className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wide">Novo chamado!</p>
                    <p className="text-xs text-muted-foreground">Aguardando sua resposta...</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-white text-xs font-bold ${URGENCY_COLORS[job.urgency] || 'bg-primary'}`}>
                  {job.urgency === 'agora' ? '🔥 Urgente' : job.urgency === 'hoje' ? '⏰ Hoje' : '📅 Esta semana'}
                </div>
              </div>

              {/* Detalhes */}
              <p className="font-bold text-foreground text-lg mb-1">
                {SERVICE_LABELS[job.service_type] || job.service_type}
              </p>
              <p className="text-sm text-muted-foreground mb-1 line-clamp-2">{job.description}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {job.address}{job.city ? `, ${job.city}` : ''}
              </p>

              {/* Ações */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl border-2 border-destructive text-destructive hover:bg-destructive/5"
                  onClick={onDecline}
                >
                  <X className="w-4 h-4 mr-1" /> Recusar
                </Button>
                <Button
                  className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold"
                  onClick={() => onAccept(job)}
                >
                  <Check className="w-4 h-4 mr-1" /> Aceitar
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}