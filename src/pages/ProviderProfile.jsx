import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Star, BadgeCheck, Phone, Mail, Award, Briefcase, MessageCircle, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import FavoriteButton from "@/components/FavoriteButton";
import CriteriaStats from "@/components/CriteriaStats";
import ProviderLevelBadge from "@/components/ProviderLevelBadge";
import AchievementsPanel from "@/components/AchievementsPanel";

export default function ProviderProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('overview');

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: async () => {
      const list = await base44.entities.Provider.filter({ id });
      return list[0];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', provider?.id],
    queryFn: () => base44.entities.Review.filter({ professional_id: provider?.id }),
    enabled: !!provider?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['provider-services', provider?.id],
    queryFn: () => base44.entities.ServiceRequest.filter({ provider_id: provider?.id }),
    enabled: !!provider?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary mb-4">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <p className="text-center text-muted-foreground">Prestador não encontrado</p>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : 0;

  const completedServices = services.filter(s => s.status === 'concluido').length;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-3 py-3 pb-16">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-primary mb-3 hover:text-primary/80 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl overflow-hidden shadow-md mb-4 border border-border"
      >
        {/* Background Header */}
        <div className="h-14 bg-gradient-to-r from-primary/20 to-primary/10" />

        {/* Profile Info */}
        <div className="px-4 pb-4">
          {/* Photo */}
          <div className="-mt-8 mb-3 flex justify-between items-end">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border-4 border-card overflow-hidden"
            >
              {provider.photo_url ? (
                <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-primary">{provider.name.charAt(0)}</span>
              )}
            </motion.div>

            {provider.is_verified && (
              <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500" />
            )}
          </div>

          {/* Name and Location */}
          <h1 className="text-lg font-bold text-foreground mb-0.5">{provider.name}</h1>
          {provider.city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3" /> {provider.city}, {provider.state}
            </p>
          )}

          {/* Level Badge */}
          {provider.id && (
            <div className="mb-2">
              <ProviderLevelBadge providerId={provider.id} showDetails={true} />
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5",
                    i < Math.floor(avgRating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <span className="font-bold text-sm text-foreground">{avgRating}</span>
            <span className="text-xs text-muted-foreground">({reviews.length} avaliações)</span>
          </div>

          {/* Bio */}
          {provider.bio && (
            <p className="text-xs text-foreground mb-2 leading-relaxed">{provider.bio}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-muted/50 rounded-xl">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{provider.total_jobs || 0}</p>
              <p className="text-[10px] text-muted-foreground">Serviços</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{completedServices}</p>
              <p className="text-[10px] text-muted-foreground">Concluídos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{provider.experience_years || 0}</p>
              <p className="text-[10px] text-muted-foreground">Anos</p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-1.5 mb-3">
            {provider.phone && (
              <a href={`tel:${provider.phone}`} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground">{provider.phone}</span>
              </a>
            )}
            {provider.email && (
              <a href={`mailto:${provider.email}`} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground">{provider.email}</span>
              </a>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button className="flex-1 bg-primary text-primary-foreground rounded-xl h-9 text-sm font-semibold">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Enviar mensagem
            </Button>
            <FavoriteButton
              providerId={provider.id}
              providerName={provider.name}
              providerData={provider}
              size="sm"
              variant="outline"
            />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Especialidades' },
          { id: 'reviews', label: 'Avaliações' },
          { id: 'achievements', label: 'Conquistas' },
          { id: 'certifications', label: 'Certificações' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              selectedTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {/* Especialidades */}
        {selectedTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {provider.specialties && provider.specialties.length > 0 ? (
              <div className="bg-card rounded-2xl p-4 border border-border">
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" /> Especialidades
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {provider.specialties.map((spec, idx) => (
                    <Badge key={idx} className="bg-primary/10 text-primary border-0 rounded-lg text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-4 border border-border text-center text-muted-foreground text-xs">
                Nenhuma especialidade informada
              </div>
            )}
          </motion.div>
        )}

        {/* Avaliações */}
        {selectedTab === 'reviews' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {reviews.length > 0 ? (
              <>
                <div className="bg-card rounded-2xl p-3 border border-border">
                  <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-primary" /> Avaliação por Critério
                  </p>
                  <CriteriaStats reviews={reviews} />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground mb-2">Todas as Avaliações</p>
                  <div className="space-y-2">
                    {reviews.map((review, idx) => (
                      <div key={idx} className="bg-card rounded-xl p-3 border border-border">
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="font-semibold text-foreground text-sm">{review.client_name}</p>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-3 h-3", i < (review.overall_rating || review.rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                            ))}
                          </div>
                        </div>
                        {(review.punctuality_rating || review.quality_rating || review.behavior_rating) && (
                          <div className="grid grid-cols-3 gap-1 mb-1.5 pb-1.5 border-b border-border text-[10px]">
                            {review.punctuality_rating && <div className="text-center"><p className="text-muted-foreground">Pontualidade</p><p className="font-bold text-primary">{review.punctuality_rating}/5</p></div>}
                            {review.quality_rating && <div className="text-center"><p className="text-muted-foreground">Qualidade</p><p className="font-bold text-primary">{review.quality_rating}/5</p></div>}
                            {review.behavior_rating && <div className="text-center"><p className="text-muted-foreground">Educação</p><p className="font-bold text-primary">{review.behavior_rating}/5</p></div>}
                          </div>
                        )}
                        {review.comment && <p className="text-xs text-foreground">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-card rounded-2xl p-4 border border-border text-center text-muted-foreground text-xs">
                Ainda não há avaliações
              </div>
            )}
          </motion.div>
        )}

        {/* Conquistas */}
        {selectedTab === 'achievements' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AchievementsPanel providerId={provider.id} />
          </motion.div>
        )}

        {/* Certificações */}
        {selectedTab === 'certifications' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-start gap-2">
                <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900 text-sm mb-0.5">Certificação Escola Prática</p>
                  <p className="text-xs text-blue-800">Prestador homologado pela Escola Prática de Serviços</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground px-1">
              {provider.is_approved ? '✓ Aprovado e homologado' : '⏳ Pendente de aprovação'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}