import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Camera, X, Upload, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const RATING_LABELS = { 1: "Muito ruim 😞", 2: "Ruim 😕", 3: "Regular 😐", 4: "Bom 😊", 5: "Excelente! 🤩" };

export default function DetailedRatingModal({ requestId, request, onClose }) {
  const [overallRating, setOverallRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [behaviorRating, setBehaviorRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [earned, setEarned] = useState(null);

  const handlePhotoAdd = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files.slice(0, 3 - photos.length)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setPhotos(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const isDetailed = comment.trim().length >= 20 && photos.length >= 1;

  const submitRating = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();

      // Cria Review com fotos
      await base44.entities.Review.create({
        professional_id: request?.provider_id,
        provider_id: request?.provider_id,
        service_request_id: requestId,
        client_id: user?.id,
        client_name: request?.client_name,
        overall_rating: overallRating,
        punctuality_rating: punctualityRating,
        quality_rating: qualityRating,
        behavior_rating: behaviorRating,
        comment,
        service_description: request?.service_type,
        review_photos: photos,
        is_detailed: isDetailed,
      });

      // Atualiza ServiceRequest
      await base44.entities.ServiceRequest.update(requestId, {
        rating_client: overallRating,
        rating_comment: comment,
      });

      // Se avaliação detalhada, concede pontos + medalha via backend
      let rewardResult = null;
      if (isDetailed) {
        const res = await base44.functions.invoke('grantEliteReviewerBadge', {
          serviceRequestId: requestId,
          clientId: user?.id,
          clientEmail: user?.email,
        });
        rewardResult = res.data;
      }

      return { isDetailed, rewardResult };
    },
    onSuccess: ({ isDetailed, rewardResult }) => {
      setEarned({ isDetailed, rewardResult });
      setDone(true);
      setTimeout(() => onClose(true), isDetailed ? 3000 : 1500);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-card rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="form" exit={{ opacity: 0 }} className="overflow-y-auto flex-1">
              {/* Header */}
              <div className="p-6 pb-0 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl font-bold text-primary">{request?.provider_name?.charAt(0) || '⭐'}</span>
                </div>
                <h2 className="text-xl font-bold text-foreground">Como foi o serviço? 🎉</h2>
                {request?.provider_name && (
                  <p className="text-sm font-semibold text-primary mt-0.5">{request.provider_name}</p>
                )}
              </div>

              <div className="p-6 space-y-5">
                {/* Estrelas geral */}
                <div className="text-center">
                  <div className="flex justify-center gap-2 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <motion.button key={s} whileTap={{ scale: 0.85 }} onClick={() => setOverallRating(s)}>
                        <Star className={cn("w-10 h-10 transition-all", s <= overallRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20")} />
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-primary">{RATING_LABELS[overallRating]}</p>
                </div>

                {/* Critérios */}
                <div className="space-y-2.5 pb-4 border-b border-border">
                  {[
                    { label: '⏰ Pontualidade', rating: punctualityRating, set: setPunctualityRating },
                    { label: '✨ Qualidade', rating: qualityRating, set: setQualityRating },
                    { label: '😊 Comportamento', rating: behaviorRating, set: setBehaviorRating },
                  ].map(c => (
                    <div key={c.label} className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-semibold">{c.label}</p>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => c.set(s)}>
                            <Star className={cn("w-5 h-5", s <= c.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20")} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comentário */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">Deixe um comentário</p>
                  <Textarea
                    placeholder="Descreva sua experiência com pelo menos 20 caracteres para ganhar pontos de fidelidade e a medalha 'Avaliador de Elite'..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="rounded-2xl min-h-[80px] resize-none text-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/500</p>
                </div>

                {/* Fotos */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Fotos do serviço
                    <span className="text-muted-foreground font-normal">(opcional, até 3)</span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {photos.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 3 && (
                      <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                        {uploading ? (
                          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                            <span className="text-[10px] text-muted-foreground">Adicionar</span>
                          </>
                        )}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} disabled={uploading} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Banner de recompensa */}
                <AnimatePresence>
                  {isDetailed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-gradient-to-r from-amber-500/15 to-primary/15 border border-primary/30 rounded-2xl p-3 flex items-center gap-3"
                    >
                      <span className="text-2xl">🏅</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">Avaliação completa detectada!</p>
                        <p className="text-xs text-muted-foreground">Você ganhará <strong className="text-primary">50 pts de fidelidade</strong> + badge <strong className="text-amber-500">Avaliador de Elite</strong></p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  className="w-full rounded-2xl bg-primary text-primary-foreground font-bold h-12"
                  onClick={() => submitRating.mutate()}
                  disabled={submitRating.isPending || uploading}
                >
                  {submitRating.isPending ? "Enviando..." : isDetailed ? "✨ Enviar e ganhar recompensa" : "Enviar avaliação"}
                </Button>

                <button
                  onClick={() => onClose(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Pular avaliação
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
            >
              {earned?.isDetailed ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className="w-24 h-24 bg-gradient-to-br from-amber-400 to-primary rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <span className="text-4xl">🏅</span>
                  </motion.div>
                  <h2 className="text-xl font-bold text-foreground mb-1">Obrigado pela avaliação!</h2>
                  <p className="text-sm text-muted-foreground mb-4">Você recebeu recompensas exclusivas por compartilhar sua experiência completa.</p>
                  <div className="space-y-2 mb-5">
                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex items-center gap-3">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">+50 Pontos de Fidelidade</p>
                        <p className="text-xs text-muted-foreground">Adicionados à sua conta</p>
                      </div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3 flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Badge "Avaliador de Elite"</p>
                        <p className="text-xs text-muted-foreground">Desbloqueado na sua Jornada</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Avaliação enviada!</h2>
                  <p className="text-sm text-muted-foreground">Obrigado pelo feedback!</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}