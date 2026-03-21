import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, BadgeCheck, Briefcase, Clock, Phone, Mail, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StarRating from '../components/shared/StarRating';

export default function ProfessionalProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = window.location.pathname.split('/').pop();

  const { data: professional, isLoading } = useQuery({
    queryKey: ['professional', id],
    queryFn: async () => {
      const list = await base44.entities.Professional.filter({ id });
      return list[0];
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => base44.entities.Review.filter({ professional_id: id }),
    initialData: [],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="w-24 h-24 rounded-2xl" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-semibold">Profissional não encontrado</h2>
        <Link to="/professionals">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/professionals">
        <Button variant="ghost" className="mb-6 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Profissionais
        </Button>
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {professional.photo_url ? (
              <img src={professional.photo_url} alt={professional.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">
                {professional.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{professional.name}</h1>
              {professional.is_verified && (
                <Badge className="bg-primary/10 text-primary border-0">
                  <BadgeCheck className="w-3 h-3 mr-1" /> Verificado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{professional.category_name}</p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <StarRating rating={professional.rating || 0} />
              <span className="text-sm text-muted-foreground">({professional.total_reviews || 0} avaliações)</span>
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-muted-foreground">
              {professional.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {professional.city}{professional.state ? `, ${professional.state}` : ''}
                </span>
              )}
              {professional.experience_years && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {professional.experience_years} anos de experiência
                </span>
              )}
              {professional.total_jobs > 0 && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" /> {professional.total_jobs} serviços
                </span>
              )}
            </div>
          </div>
          <Link to={`/request-quote?professional=${professional.id}`}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap">
              Pedir Orçamento
            </Button>
          </Link>
        </div>

        {professional.description && (
          <>
            <Separator className="my-6" />
            <div>
              <h2 className="font-semibold text-foreground mb-2">Sobre</h2>
              <p className="text-muted-foreground leading-relaxed">{professional.description}</p>
            </div>
          </>
        )}

        {professional.services_offered?.length > 0 && (
          <>
            <Separator className="my-6" />
            <div>
              <h2 className="font-semibold text-foreground mb-3">Serviços Oferecidos</h2>
              <div className="flex flex-wrap gap-2">
                {professional.services_offered.map((s, i) => (
                  <Badge key={i} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {professional.phone && (
          <>
            <Separator className="my-6" />
            <div>
              <h2 className="font-semibold text-foreground mb-3">Contato</h2>
              <div className="space-y-2 text-sm">
                {professional.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" /> {professional.phone}
                  </div>
                )}
                {professional.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" /> {professional.email}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      {reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Avaliações ({reviews.length})</h2>
          <div className="space-y-4">
            {reviews.map(review => (
              <Card key={review.id} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{review.client_name || 'Cliente'}</span>
                  <StarRating rating={review.rating} size={14} showValue={false} />
                </div>
                {review.comment && (
                  <p className="text-muted-foreground text-sm mt-2">{review.comment}</p>
                )}
                {review.service_description && (
                  <p className="text-xs text-muted-foreground mt-2">Serviço: {review.service_description}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}