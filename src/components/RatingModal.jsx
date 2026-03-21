import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RatingModal({ requestId, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hovered, setHovered] = useState(0);
  const queryClient = useQueryClient();

  const submitRating = useMutation({
    mutationFn: () => base44.entities.ServiceRequest.update(requestId, {
      rating_client: rating,
      rating_comment: comment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-foreground text-center mb-1">Avalie o serviço</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Como foi a experiência?</p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(s)}
            >
              <Star className={cn(
                "w-10 h-10 transition-all",
                s <= (hovered || rating) ? "text-yellow-400 fill-yellow-400 scale-110" : "text-muted"
              )} />
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Deixe um comentário (opcional)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="rounded-2xl mb-4"
        />

        <Button
          className="w-full rounded-2xl bg-primary text-primary-foreground font-bold"
          onClick={() => submitRating.mutate()}
          disabled={submitRating.isPending}
        >
          Enviar avaliação
        </Button>
        <Button variant="ghost" className="w-full mt-2 rounded-2xl" onClick={onClose}>
          Depois
        </Button>
      </div>
    </div>
  );
}