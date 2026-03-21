import React from 'react';
import { ChevronDown, MapPin, Calendar, User, DollarSign, Star } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ServiceHistoryItem({ service, isExpanded, onToggle, serviceLabel, statusConfig }) {
  const serviceDate = new Date(service.created_date);
  const formattedDate = serviceDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const hasRating = service.rating_client !== null && service.rating_client !== undefined;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
      {/* Summary */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-foreground">{serviceLabel}</span>
            {statusConfig && (
              <span className={cn("text-xs px-2 py-1 rounded-lg font-medium", statusConfig.color)}>
                {statusConfig.label}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{service.address}</p>
          <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform",
            isExpanded && "transform rotate-180"
          )}
        />
      </button>

      {/* Details */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-4 bg-muted/30 space-y-4">
          {/* Descrição */}
          {service.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-foreground">{service.description}</p>
            </div>
          )}

          {/* Localização */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Localização</p>
              <p className="text-sm text-foreground">{service.address}</p>
              {service.city && <p className="text-xs text-muted-foreground">{service.city}, {service.state}</p>}
            </div>
          </div>

          {/* Reboque Distance */}
          {service.service_type === 'reboque' && service.tow_distance_km && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Distância de reboque</p>
              <p className="text-lg font-bold text-primary">{service.tow_distance_km.toFixed(1)} km</p>
            </div>
          )}

          {/* Prestador */}
          {service.provider_name && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Prestador</p>
                <p className="text-sm text-foreground">{service.provider_name}</p>
                {service.provider_phone && (
                  <p className="text-xs text-muted-foreground">{service.provider_phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Preços */}
          {(service.estimated_price || service.final_price) && (
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Valor</p>
                {service.estimated_price && (
                  <p className="text-sm text-foreground">Estimado: R$ {service.estimated_price.toFixed(2)}</p>
                )}
                {service.final_price && (
                  <p className="text-sm font-semibold text-primary">Final: R$ {service.final_price.toFixed(2)}</p>
                )}
              </div>
            </div>
          )}

          {/* Agendamento */}
          {service.scheduled_date && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Agendado para</p>
                <p className="text-sm text-foreground">
                  {new Date(service.scheduled_date).toLocaleDateString('pt-BR')} às {service.scheduled_time}
                </p>
              </div>
            </div>
          )}

          {/* Avaliação */}
          {service.status === 'concluido' && (
            <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
              {hasRating ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Sua avaliação</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < service.rating_client
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                    <span className="text-sm font-semibold text-foreground ml-1">
                      {service.rating_client}/5
                    </span>
                  </div>
                  {service.rating_comment && (
                    <p className="text-sm text-foreground italic">"{service.rating_comment}"</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Serviço concluído, mas ainda não avaliado</p>
              )}
            </div>
          )}

          {/* Adicionais */}
          {service.additional_points && service.additional_points.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Pontos adicionais</p>
              <div className="space-y-2">
                {service.additional_points.map((point, idx) => (
                  <div key={idx} className="text-sm bg-white rounded-lg p-2 border border-border">
                    <p className="font-semibold text-foreground">{point.title}</p>
                    {point.description && (
                      <p className="text-xs text-muted-foreground">{point.description}</p>
                    )}
                    {point.extra_cost && (
                      <p className="text-xs text-orange-600 font-semibold">+R$ {point.extra_cost.toFixed(2)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}