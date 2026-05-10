import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Shield, AlertCircle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICE_LABELS = {
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  pintura: 'Pintura',
  montagem: 'Montagem',
  reparo_geral: 'Reparo Geral',
  alvenaria: 'Alvenaria',
  fechadura: 'Fechadura',
  ar_condicionado: 'Ar Condicionado',
  outros: 'Outros',
};

export default function WarrantyPanel({ clientEmail, onRequestReturn }) {
  const { data: warrantyServices = [], isLoading } = useQuery({
    queryKey: ['warranty-services', clientEmail],
    queryFn: async () => {
      if (!clientEmail) return [];
      const services = await base44.entities.ServiceRequest.filter(
        { 
          created_by: clientEmail,
          status: 'concluido',
          warranty_status: 'ativa'
        },
        '-created_date',
        50
      );
      return services.filter(s => {
        if (!s.warranty_end_date) return false;
        const endDate = new Date(s.warranty_end_date);
        return endDate > new Date();
      });
    },
    enabled: !!clientEmail,
  });

  const getWarrantyDaysRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  const getWarrantyColor = (daysRemaining) => {
    if (daysRemaining > 30) return 'text-green-600 bg-green-50';
    if (daysRemaining > 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (warrantyServices.length === 0) {
    return (
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 text-center">
        <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-blue-800">Nenhum serviço com garantia ativa</p>
        <p className="text-xs text-blue-600 mt-1">Seus serviços concluídos receberão 90 dias de garantia</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Serviços com Garantia Ativa</h3>
      </div>

      {warrantyServices.map((service) => {
        const daysRemaining = getWarrantyDaysRemaining(service.warranty_end_date);
        const warrantyColor = getWarrantyColor(daysRemaining);
        const endDate = new Date(service.warranty_end_date);

        return (
          <div
            key={service.id}
            className={cn(
              'rounded-2xl p-4 border-2 transition-all',
              daysRemaining > 0
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">
                  {SERVICE_LABELS[service.service_type] || service.service_type}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {service.service_number}
                </p>
              </div>
              <div className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0',
                warrantyColor
              )}>
                {daysRemaining > 0 ? (
                  <>
                    <Clock className="w-3 h-3" />
                    {daysRemaining}d
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Expirada
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {service.description}
            </p>

            <div className="bg-white rounded-xl p-3 mb-3 border border-border/50">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Termo: 90 dias</p>
                  <p className="font-semibold text-foreground">
                    {new Date(service.created_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vence em</p>
                  <p className="font-semibold text-foreground">
                    {endDate.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {daysRemaining > 0 && (
              <Button
                size="sm"
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold h-9"
                onClick={() => onRequestReturn(service)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Solicitar Retorno
              </Button>
            )}

            {daysRemaining === 0 && (
              <p className="text-xs text-red-600 font-semibold text-center">
                ⚠️ Garantia expirada — não é mais possível solicitar retorno
              </p>
            )}

            {service.provider_name && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Prestador: {service.provider_name}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}