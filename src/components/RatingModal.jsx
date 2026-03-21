import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const RATING_LABELS = {
  1: "Muito ruim 😞",
  2: "Ruim 😕",
  3: "Regular 😐",
  4: "Bom 😊",
  5: "Excelente! 🤩",
};

export default function RatingModal({ requestId, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hovered, setHovered] = useState(0);
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();

  const { data: request } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: async () => {
      const list = await base44.entities.ServiceRequest.filter({ id: requestId });
      return list[0];
    },
  });

  const submitRating = useMutation({
    mutationFn: () => base44.entities.ServiceRequest.update(requestId, {
      rating_client: rating,
      rating_comment: comment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId] });
      setDone(true);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="form" exit={{ opacity: 0 }} className="p-6">
              {/* Header */}
              <div className="text-center mb-5">
                {request?.provider_name && (
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl font-bold text-primary">{request.provider_name.charAt(0)}</span>
                  </div>
                )}
                <h2 className="text-xl font-bold text-foreground">Como foi o atendimento?</h2>
                {request?.provider_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Avalie <span className="font-semibold text-foreground">{request.provider_name}</span>
                  </p>
                )}
              </div>

              {/* Estrelas */}
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    className="focus:outline-none"
                  >
                    <Star className={cn(
                      "w-11 h-11 transition-all duration-150",
                      s <= (hovered || rating)
                        ? "text-yellow-400 fill-yellow-400 scale-110"
                        : "text-muted-foreground/30"
                    )} />
                  </button>
                ))}
              </div>

              {/* Label da nota */}
              <p className="text-center text-sm font-semibold text-primary mb-5 h-5">
                {RATING_LABELS[hovered || rating]}
              </p>

              {/* Comentário */}
              <Textarea
                placeholder="Conte como foi a experiência (opcional)..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="rounded-2xl mb-4 min-h-[90px]"
              />

              <Button
                className="w-full rounded-2xl bg-primary text-primary-foreground font-bold h-12"
                onClick={() => submitRating.mutate()}
                disabled={submitRating.isPending}
              >
                {submitRating.isPending ? "Enviando..." : "Enviar avaliação"}
              </Button>
              <Button variant="ghost" className="w-full mt-2 rounded-2xl text-muted-foreground" onClick={onClose}>
                Agora não
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Avaliação enviada!</h2>
              <p className="text-sm text-muted-foreground mb-2">
                Obrigado pelo feedback. Isso ajuda a manter a qualidade dos nossos prestadores.
              </p>
              <div className="flex justify-center gap-1 mb-6">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn("w-6 h-6", s <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                ))}
              </div>
              <Button className="w-full rounded-2xl bg-primary text-primary-foreground font-bold" onClick={onClose}>
                <ThumbsUp className="w-4 h-4 mr-2" /> Fechar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}