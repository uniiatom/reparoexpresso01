import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Star, BadgeCheck, Phone, Mail, Award, Briefcase, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import FavoriteButton from "@/components/FavoriteButton";

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
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary mb-6 hover:text-primary/80 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl overflow-hidden shadow-xl mb-6 border border-border"
      >
        {/* Background Header */}
        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/10" />

        {/* Profile Info */}
        <div className="px-6 pb-6">
          {/* Photo */}
          <div className="-mt-12 mb-4 flex justify-between items-end">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border-4 border-card overflow-hidden"
            >
              {provider.photo_url ? (
                <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">{provider.name.charAt(0)}</span>
              )}
            </motion.div>

            {provider.is_verified && (
              <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-500" />
            )}
          </div>

          {/* Name and Location */}
          <h1 className="text-2xl font-bold text-foreground mb-1">{provider.name}</h1>
          {provider.city && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
              <MapPin className="w-4 h-4" /> {provider.city}, {provider.state}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-5 h-5",
                    i < Math.floor(avgRating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <span className="font-bold text-foreground">{avgRating}</span>
            <span className="text-sm text-muted-foreground">({reviews.length} avaliações)</span>
          </div>

          {/* Bio */}
          {provider.bio && (
            <p className="text-sm text-foreground mb-4 leading-relaxed">{provider.bio}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 p-3 bg-muted/50 rounded-2xl">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{provider.total_jobs || 0}</p>
              <p className="text-xs text-muted-foreground">Serviços</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{completedServices}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{provider.experience_years || 0}</p>
              <p className="text-xs text-muted-foreground">Anos</p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2 mb-6">
            {provider.phone && (
              <a href={`tel:${provider.phone}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl hover:bg-muted transition-colors">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{provider.phone}</span>
              </a>
            )}
            {provider.email && (
              <a href={`mailto:${provider.email}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl hover:bg-muted transition-colors">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{provider.email}</span>
              </a>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button className="flex-1 bg-primary text-primary-foreground rounded-2xl h-11 font-semibold">
              <MessageCircle className="w-4 h-4 mr-2" /> Enviar mensagem
            </Button>
            <FavoriteButton
              providerId={provider.id}
              providerName={provider.name}
              size="md"
              variant="outline"
            />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'overview', label: 'Especialidades' },
          { id: 'reviews', label: 'Avaliações' },
          { id: 'certifications', label: 'Certificações' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
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
      <div className="space-y-4">
        {/* Especialidades */}
        {selectedTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {provider.specialties && provider.specialties.length > 0 ? (
              <div className="bg-card rounded-3xl p-6 border border-border">
                <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Especialidades
                </p>
                <div className="flex flex-wrap gap-2">
                  {provider.specialties.map((spec, idx) => (
                    <Badge key={idx} className="bg-primary/10 text-primary border-0 rounded-xl">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-3xl p-6 border border-border text-center text-muted-foreground text-sm">
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
              reviews.map((review, idx) => (
                <div key={idx} className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-foreground">{review.client_name}</p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4",
                            i < review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {review.service_description && (
                    <p className="text-xs text-muted-foreground mb-2">{review.service_description}</p>
                  )}
                  {review.comment && (
                    <p className="text-sm text-foreground">{review.comment}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-card rounded-3xl p-6 border border-border text-center text-muted-foreground text-sm">
                Ainda não há avaliações
              </div>
            )}
          </motion.div>
        )}

        {/* Certificações */}
        {selectedTab === 'certifications' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900 mb-1">Certificação Escola Prática</p>
                  <p className="text-sm text-blue-800">Prestador homologado pela Escola Prática de Serviços</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground px-2">
              {provider.is_approved ? '✓ Aprovado e homologado' : '⏳ Pendente de aprovação'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}