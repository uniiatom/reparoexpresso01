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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 25, stiffness: 400 }}
        className="bg-card rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="form" exit={{ opacity: 0 }} className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                {request?.provider_name && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-3"
                  >
                    <span className="text-3xl font-bold text-primary">{request.provider_name.charAt(0)}</span>
                  </motion.div>
                )}
                <h2 className="text-2xl font-bold text-foreground">Serviço concluído! 🎉</h2>
                <p className="text-sm text-muted-foreground mt-2">Como foi a experiência com o prestador?</p>
                {request?.provider_name && (
                  <p className="text-sm font-semibold text-primary mt-1">
                    {request.provider_name}
                  </p>
                )}
              </div>

              {/* Estrelas */}
              <div className="flex justify-center gap-3 mb-3">
                {[1, 2, 3, 4, 5].map((s, idx) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    className="focus:outline-none cursor-pointer"
                  >
                    <Star className={cn(
                      "w-12 h-12 transition-all duration-150",
                      s <= (hovered || rating)
                        ? "text-yellow-400 fill-yellow-400 scale-110"
                        : "text-muted-foreground/20"
                    )} />
                  </motion.button>
                ))}
              </div>

              {/* Label da nota */}
              <motion.p 
                key={hovered || rating}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-base font-bold text-primary mb-6 h-6"
              >
                {RATING_LABELS[hovered || rating]}
              </motion.p>

              {/* Comentário */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold">Deixe um comentário (opcional)</p>
                <Textarea
                  placeholder="Conte como foi a experiência..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="rounded-2xl min-h-[90px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/500</p>
              </div>

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