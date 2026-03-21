import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, BadgeCheck, Briefcase } from "lucide-react";
import StarRating from './StarRating';

export default function ProfessionalCard({ professional }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {professional.photo_url ? (
              <img src={professional.photo_url} alt={professional.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-primary">
                {professional.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{professional.name}</h3>
              {professional.is_verified && (
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{professional.category_name}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <StarRating rating={professional.rating || 0} size={14} />
              <span className="text-xs text-muted-foreground">({professional.total_reviews || 0})</span>
            </div>
          </div>
        </div>

        {professional.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{professional.description}</p>
        )}

        <div className="flex items-center flex-wrap gap-2 mt-3">
          {professional.city && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{professional.city}{professional.state ? `, ${professional.state}` : ''}</span>
            </div>
          )}
          {professional.experience_years && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="w-3 h-3" />
              <span>{professional.experience_years} anos</span>
            </div>
          )}
          {professional.price_range && (
            <Badge variant="secondary" className="text-xs">{professional.price_range}</Badge>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Link to={`/professional/${professional.id}`} className="flex-1">
            <Button variant="outline" className="w-full text-sm">Ver Perfil</Button>
          </Link>
          <Link to={`/request-quote?professional=${professional.id}`} className="flex-1">
            <Button className="w-full text-sm bg-primary hover:bg-primary/90 text-primary-foreground">
              Pedir Orçamento
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}