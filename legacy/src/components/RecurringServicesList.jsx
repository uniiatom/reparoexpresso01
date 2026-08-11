import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Repeat, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const RECURRENCE_LABELS = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual'
};

const SERVICE_LABELS = {
   eletrica: 'Elétrica',
   hidraulica: 'Hidráulica',
   limpeza_calha: 'Limpeza de Calha',
   limpeza_caixa_dagua: 'Limpeza Caixa d\'Água',
   ar_condicionado: 'Ar Condicionado',
   manutencao: 'Manutenção Preventiva'
};

const formatDateSafely = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) return '—';
  return date.toLocaleDateString('pt-BR');
};

export default function RecurringServicesList({ clientId }) {
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['recurring-schedules', clientId],
    queryFn: () => base44.entities.RecurringServiceSchedule.filter({ client_id: clientId })
  });

  const toggleMutation = useMutation({
    mutationFn: (schedule) => 
      base44.entities.RecurringServiceSchedule.update(schedule.id, {
        is_active: !schedule.is_active
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', clientId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (scheduleId) => 
      base44.entities.RecurringServiceSchedule.delete(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', clientId] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum serviço recorrente agendado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map(schedule => (
        <Card key={schedule.id} className={cn(!schedule.is_active && "opacity-60")}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base mb-2">
                  {SERVICE_LABELS[schedule.service_type] || schedule.service_type}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Repeat className="w-3 h-3" />
                    {RECURRENCE_LABELS[schedule.recurrence_pattern]}
                  </Badge>
                  {!schedule.is_active && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-700">
                      Inativa
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleMutation.mutate(schedule)}
                disabled={toggleMutation.isPending}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                {schedule.is_active ? (
                  <ToggleRight className="w-5 h-5 text-primary" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{schedule.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{schedule.address}</p>
                  <p className="text-muted-foreground">{schedule.city}, {schedule.state}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                 <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                 <div>
                   <p className="font-medium text-foreground">Próximo serviço</p>
                   <p className="text-muted-foreground">
                     {formatDateSafely(schedule.next_service_date)}
                   </p>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
               <div>
                 <p className="text-muted-foreground">Início</p>
                 <p className="font-medium text-foreground">
                   {formatDateSafely(schedule.start_date)}
                 </p>
               </div>
               {schedule.end_date && (
                 <div>
                   <p className="text-muted-foreground">Término</p>
                   <p className="font-medium text-foreground">
                     {formatDateSafely(schedule.end_date)}
                   </p>
                 </div>
               )}
              <div>
                <p className="text-muted-foreground">Serviços criados</p>
                <p className="font-medium text-foreground">{schedule.total_occurrences_created}</p>
              </div>
            </div>

            {schedule.client_suggested_price && (
              <div className="text-sm font-semibold text-primary">
                R$ {Number(schedule.client_suggested_price).toFixed(2)}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(schedule.id)}
              disabled={deleteMutation.isPending}
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover agendamento
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}